"use client"

// IndexedDB cache for messages matching Supabase schema
type CachedMessage = {
  type: string
  id: string
  user_id: string
  date_sent: string
  created_at: string
  updated_at: string
  receiver_id: string
  bundle_id: string | null
  current_project: string | null
  content: string
  status: string
  file_url: string | null
  mime_type: string | null
  progress_update: string | null
}

type ConversationKey = string // Format: "userId1-userId2" (sorted)

type CachedImage = {
  url: string // Original URL (key)
  blob: Blob
  mimeType: string
  cachedAt: string
}

const DB_NAME = "horizon_messages_cache"
const DB_VERSION = 2 // Incremented version for new object store
const MESSAGES_STORE = "messages"
const METADATA_STORE = "metadata"
const IMAGES_STORE = "images" // New store for image blobs

class MessageCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  private objectURLs: Map<string, string> = new Map()

  private async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Messages store - mirrors Supabase messages table
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: "id" })
          messagesStore.createIndex("conversation", "conversationKey", { unique: false })
          messagesStore.createIndex("date_sent", "date_sent", { unique: false })
          messagesStore.createIndex("user_id", "user_id", { unique: false })
          messagesStore.createIndex("receiver_id", "receiver_id", { unique: false })
        }

        // Metadata store for tracking last fetch times
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: "conversationKey" })
        }

        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE, { keyPath: "url" })
        }
      }
    })

    return this.initPromise
  }

  private getConversationKey(userId: string, userId2: string): string {
    // Sort IDs to ensure consistent key regardless of order
    return [userId, userId2].sort().join("-")
  }

  private async cacheImageBlob(url: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (!response.ok) return

      const blob = await response.blob()
      const mimeType = response.headers.get("content-type") || blob.type

      await this.init()
      if (!this.db) return

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([IMAGES_STORE], "readwrite")
        const store = transaction.objectStore(IMAGES_STORE)

        const cachedImage: CachedImage = {
          url,
          blob,
          mimeType,
          cachedAt: new Date().toISOString(),
        }

        store.put(cachedImage)

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error("[v0] Failed to cache image blob:", error)
    }
  }

  async getCachedImageURL(url: string): Promise<string | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IMAGES_STORE], "readonly")
      const store = transaction.objectStore(IMAGES_STORE)
      const request = store.get(url)

      request.onsuccess = () => {
        const cachedImage = request.result as CachedImage | undefined
        if (cachedImage) {
          // Create object URL from cached blob
          const objectURL = URL.createObjectURL(cachedImage.blob)
          this.objectURLs.set(url, objectURL)
          resolve(objectURL)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  revokeImageURL(originalURL: string): void {
    const objectURL = this.objectURLs.get(originalURL)
    if (objectURL) {
      URL.revokeObjectURL(objectURL)
      this.objectURLs.delete(originalURL)
    }
  }

  async getMessages(userId: string, otherUserId: string): Promise<CachedMessage[]> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const conversationKey = this.getConversationKey(userId, otherUserId)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], "readonly")
      const store = transaction.objectStore(MESSAGES_STORE)
      const index = store.index("conversation")
      const request = index.getAll(conversationKey)

      request.onsuccess = () => {
        const messages = request.result as CachedMessage[]
        // Sort by date_sent ascending
        messages.sort((a, b) => new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime())
        resolve(messages)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setMessages(userId: string, otherUserId: string, messages: any[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const conversationKey = this.getConversationKey(userId, otherUserId)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, METADATA_STORE], "readwrite")
      const messagesStore = transaction.objectStore(MESSAGES_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)

      // Store each message with conversationKey
      messages.forEach((message) => {
        const cachedMessage: CachedMessage & { conversationKey: string } = {
          ...message,
          conversationKey,
          bundle_id: message.bundle_id || null,
          current_project: message.current_project || null,
          file_url: message.file_url || null,
          mime_type: message.mime_type || null,
          progress_update: message.progress_update || null,
        }
        messagesStore.put(cachedMessage)

        if (message.file_url && message.mime_type?.startsWith("image/")) {
          this.cacheImageBlob(message.file_url).catch((err) => console.error("[v0] Failed to cache image:", err))
        }
      })

      // Update metadata with last fetch time
      metadataStore.put({
        conversationKey,
        lastFetch: new Date().toISOString(),
        messageCount: messages.length,
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async addMessage(userId: string, otherUserId: string, message: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const conversationKey = this.getConversationKey(userId, otherUserId)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], "readwrite")
      const store = transaction.objectStore(MESSAGES_STORE)

      const cachedMessage: CachedMessage & { conversationKey: string } = {
        ...message,
        conversationKey,
        bundle_id: message.bundle_id || null,
        current_project: message.current_project || null,
        file_url: message.file_url || null,
        mime_type: message.mime_type || null,
        progress_update: message.progress_update || null,
      }

      store.put(cachedMessage)

      transaction.oncomplete = () => {
        if (message.file_url && message.mime_type?.startsWith("image/")) {
          this.cacheImageBlob(message.file_url).catch((err) => console.error("[v0] Failed to cache image:", err))
        }
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getLastFetchTime(userId: string, otherUserId: string): Promise<string | null> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const conversationKey = this.getConversationKey(userId, otherUserId)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], "readonly")
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.get(conversationKey)

      request.onsuccess = () => {
        const metadata = request.result
        resolve(metadata?.lastFetch || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearConversation(userId: string, otherUserId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const conversationKey = this.getConversationKey(userId, otherUserId)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, METADATA_STORE], "readwrite")
      const messagesStore = transaction.objectStore(MESSAGES_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)
      const index = messagesStore.index("conversation")

      const request = index.openCursor(conversationKey)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      metadataStore.delete(conversationKey)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async clearAll(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, METADATA_STORE, IMAGES_STORE], "readwrite")
      const messagesStore = transaction.objectStore(MESSAGES_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)
      const imagesStore = transaction.objectStore(IMAGES_STORE) // Clear cached images

      messagesStore.clear()
      metadataStore.clear()
      imagesStore.clear()

      transaction.oncomplete = () => {
        this.objectURLs.forEach((url) => URL.revokeObjectURL(url))
        this.objectURLs.clear()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

// Singleton instance
export const messageCache = new MessageCache()
