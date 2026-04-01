// Offline Queue Manager using IndexedDB
// Handles caching of messages with text and images when offline
// Auto-syncs when connection is restored

const DB_NAME = "horizon_offline_db"
const DB_VERSION = 1
const STORE_NAME = "pending_messages"

export interface PendingMessage {
  id: string
  timestamp: number
  formData: {
    content: string
    userId: string
    receiverId: string
    bundleId: string
    currentProject?: string
    messageType?: string
    progressUpdate?: string
    totalPrice?: string
    itemsPurchased?: string
    category?: string
    vendorName?: string
  }
  files: Array<{
    name: string
    type: string
    base64: string
  }>
  retryCount: number
  lastAttempt?: number
  error?: string
}

class OfflineQueueManager {
  private db: IDBDatabase | null = null
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncInProgress = false
  private listeners: Set<() => void> = new Set()
  private syncTimer: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.initDB()
      this.setupEventListeners()
    }
  }

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error("[v0] Failed to open IndexedDB:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  // Setup online/offline event listeners
  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true
      this.notifyListeners()
      this.debouncedSync()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  // Subscribe to connection status changes
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback())
  }

  // Get current connection status
  public getIsOnline(): boolean {
    return this.isOnline
  }

  // Convert File to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(",")[1]) // Remove data URL prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Add message to offline queue
  public async addToQueue(formData: FormData, files: File[]): Promise<string> {
    if (!this.db) {
      await this.initDB()
    }

    const id = crypto.randomUUID()

    // Convert files to base64 for storage
    const fileData = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        base64: await this.fileToBase64(file),
      })),
    )

    const pendingMessage: PendingMessage = {
      id,
      timestamp: Date.now(),
      formData: {
        content: (formData.get("content") as string) || "",
        userId: formData.get("userId") as string,
        receiverId: formData.get("receiverId") as string,
        bundleId: (formData.get("bundleId") as string) || crypto.randomUUID(),
        currentProject: (formData.get("currentProject") as string) || undefined,
        messageType: (formData.get("messageType") as string) || undefined,
        progressUpdate: (formData.get("progressUpdate") as string) || undefined,
        totalPrice: (formData.get("totalPrice") as string) || undefined,
        itemsPurchased: (formData.get("itemsPurchased") as string) || undefined,
        category: (formData.get("category") as string) || undefined,
        vendorName: (formData.get("vendorName") as string) || undefined,
      },
      files: fileData,
      retryCount: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(pendingMessage)

      request.onsuccess = () => {
        this.notifyListeners()
        resolve(id)
      }

      request.onerror = () => {
        console.error("[v0] Failed to add message to queue:", request.error)
        reject(request.error)
      }
    })
  }

  // Get all pending messages
  public async getPendingMessages(): Promise<PendingMessage[]> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index("timestamp")
      const request = index.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Remove message from queue
  private async removeFromQueue(id: string): Promise<void> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        this.notifyListeners()
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Update message retry count
  private async updateRetryCount(message: PendingMessage): Promise<void> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(message)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Sync a single message
  private async syncMessage(
    message: PendingMessage,
    sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>,
  ): Promise<boolean> {
    try {
      // Upload files first
      const fileData: Array<{ url: string; mimeType: string }> = []

      for (const file of message.files) {
        // Convert base64 back to Blob
        const byteString = atob(file.base64)
        const arrayBuffer = new ArrayBuffer(byteString.length)
        const uint8Array = new Uint8Array(arrayBuffer)

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i)
        }

        const blob = new Blob([arrayBuffer], { type: file.type })
        const fileObj = new File([blob], file.name, { type: file.type })

        // Upload file
        const uploadFormData = new FormData()
        uploadFormData.append("file", fileObj)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${file.name}`)
        }

        const uploadResult = await uploadResponse.json()
        fileData.push({
          url: uploadResult.url,
          mimeType: uploadResult.type,
        })
      }

      // Create FormData for message
      const formData = new FormData()
      Object.entries(message.formData).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value)
        }
      })
      formData.append("fileData", JSON.stringify(fileData))

      // Send message
      const result = await sendMessageAction(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      return true
    } catch (error) {
      console.error("[v0] Failed to sync message:", error)

      // Update retry count
      message.retryCount++
      message.lastAttempt = Date.now()
      message.error = error instanceof Error ? error.message : "Unknown error"

      // Keep message in queue if retry count is below limit
      if (message.retryCount < 5) {
        await this.updateRetryCount(message)
        return false
      } else {
        // Remove message after 5 failed attempts
        console.error("[v0] Message failed after 5 attempts, removing from queue")
        return false
      }
    }
  }

  // Sync all pending messages
  public async syncPendingMessages(
    sendMessageAction?: (formData: FormData) => Promise<{ success?: boolean; error?: string }>,
  ): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return
    }

    if (!sendMessageAction) {
      return
    }

    this.syncInProgress = true

    try {
      const messages = await this.getPendingMessages()

      if (messages.length === 0) {
        return
      }

      // Process messages in order (oldest first)
      for (const message of messages) {
        const success = await this.syncMessage(message, sendMessageAction)

        if (success) {
          await this.removeFromQueue(message.id)
        } else {
          // If a message fails, we continue to try the rest
        }

        // Small delay between messages to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error("[v0] Error during sync:", error)
    } finally {
      this.syncInProgress = false
      this.notifyListeners()
    }
  }

  // Get queue status
  public async getQueueStatus(): Promise<{
    count: number
    oldestTimestamp?: number
    hasErrors: boolean
  }> {
    const messages = await this.getPendingMessages()

    return {
      count: messages.length,
      oldestTimestamp: messages[0]?.timestamp,
      hasErrors: messages.some((m) => m.error),
    }
  }

  // Clear all messages from queue (for testing/debugging)
  public async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        this.notifyListeners()
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  private debouncedSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
    }
    this.syncTimer = setTimeout(() => {
      this.syncPendingMessages()
    }, 1000) // Wait 1 second before syncing
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager()
