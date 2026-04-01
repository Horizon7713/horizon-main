"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageInput } from "@/components/message-input"
import { MessageList } from "@/components/message-list"
import { MessageHeader } from "@/components/message-header"
import { MessageBubble } from "@/components/message-bubble"
import { MessageGallery } from "@/components/message-gallery"
import { messageCache } from "@/lib/message-cache"
import { offlineQueue } from "@/lib/offline-queue"
import { OfflineIndicator } from "./offline-indicator"
import { supabase } from "@/lib/supabase/client"

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  company: string | null
  role: string | null
}

type Message = {
  id: string
  content: string
  type: string
  date_sent: string
  status: string
  user_id: string
  receiver_id: string
  file_url?: string | null
  bundle_id?: string | null
  mime_type?: string | null
  current_project?: string | null
}

interface MessagesClientProps {
  users: User[]
  currentUserId: string
  authUserId: string
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
  fetchMessagesAction: (
    userId: string,
    otherUserId: string,
    initialLoad?: boolean,
    limit?: number,
    offset?: number,
    since?: string,
  ) => Promise<{ messages: Message[]; error?: string; totalCount?: number }>
}

export function MessagesClient({
  users,
  currentUserId,
  authUserId,
  sendMessageAction,
  fetchMessagesAction,
}: MessagesClientProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [allCachedMessages, setAllCachedMessages] = useState<Message[]>([])
  const [displayedCount, setDisplayedCount] = useState(15)
  const [isLoading, setIsLoading] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
  const [showMobileMessages, setShowMobileMessages] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef<number>(0)
  const isRestoringScrollRef = useRef<boolean>(false)
  const savedScrollPositionRef = useRef<number>(0)

  const otherUsers = users.filter((user) => user.id !== currentUserId)

  const currentUser = users.find((user) => user.id === currentUserId)
  const currentUserRole = currentUser?.role || null

  const hasSingleContact = otherUsers.length === 1

  useEffect(() => {
    if (hasSingleContact && !selectedUser && otherUsers.length > 0) {
      console.log("[v0] Auto-selecting single contact:", otherUsers[0].email)
      handleSelectUser(otherUsers[0])
    }
  }, [hasSingleContact, otherUsers])

  useEffect(() => {
    if (!selectedUser) return

    console.log("[v0] Setting up realtime subscription for messages")

    // Subscribe to INSERT events on messages table
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("[v0] Realtime: New message received", payload)

          const newMessage = payload.new as Message

          const isRelevant =
            (newMessage.user_id === currentUserId && newMessage.receiver_id === selectedUser.id) ||
            (newMessage.user_id === selectedUser.id && newMessage.receiver_id === currentUserId)

          if (!isRelevant) {
            console.log("[v0] Message not relevant to current conversation, skipping")
            return
          }

          const shouldScroll = isNearBottom()

          setMessages((prevMessages) => {
            // Check if message already exists
            if (prevMessages.some((msg) => msg.id === newMessage.id)) {
              console.log("[v0] Message already exists, skipping duplicate")
              return prevMessages
            }

            console.log("[v0] Adding new message from realtime subscription")

            // Add to cache
            messageCache.addMessage(currentUserId, selectedUser.id, newMessage).catch(console.error)

            // Update all cached messages
            setAllCachedMessages((prev) => [...prev, newMessage])

            // Enable auto-scroll if near bottom
            if (shouldScroll) {
              setShouldAutoScroll(true)
            }

            return [...prevMessages, newMessage]
          })
        },
      )
      .subscribe((status) => {
        console.log("[v0] Realtime subscription status:", status)
      })

    // Cleanup subscription on unmount or when selectedUser changes
    return () => {
      console.log("[v0] Cleaning up realtime subscription")
      supabase.removeChannel(channel)
    }
  }, [selectedUser, currentUserId])

  useEffect(() => {
    if (isRestoringScrollRef.current && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current
      const newScrollHeight = scrollContainer.scrollHeight
      const heightDifference = newScrollHeight - previousScrollHeightRef.current

      console.log("[v0] Restoring scroll position:", {
        previousScrollHeight: previousScrollHeightRef.current,
        newScrollHeight,
        heightDifference,
        currentScrollTop: scrollContainer.scrollTop,
      })

      scrollContainer.scrollTop = scrollContainer.scrollTop + heightDifference
      isRestoringScrollRef.current = false
    }
  }, [messages])

  useEffect(() => {
    if (shouldAutoScroll && !isLoading && messages.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      setShouldAutoScroll(false)
    }
  }, [shouldAutoScroll, isLoading, messages.length])

  useEffect(() => {
    if (!showGallery && savedScrollPositionRef.current > 0 && scrollContainerRef.current) {
      // Restore scroll position after gallery closes
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollPositionRef.current
          savedScrollPositionRef.current = 0
        }
      })
    }
  }, [showGallery])

  useEffect(() => {
    const startAutoSync = async () => {
      if (offlineQueue.getIsOnline()) {
        await offlineQueue.syncPendingMessages(sendMessageAction)
      }
    }

    startAutoSync()

    // Subscribe to connection status changes
    const unsubscribe = offlineQueue.subscribe(async () => {
      if (offlineQueue.getIsOnline()) {
        await offlineQueue.syncPendingMessages(sendMessageAction)
      }
    })

    return unsubscribe
  }, [sendMessageAction])

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user)
    setIsLoading(true)
    setShowGallery(false)
    setShowMobileMessages(true)
    setMessages([])
    setAllCachedMessages([])
    setDisplayedCount(15)
    setTotalCount(0)
    setHasMoreMessages(false)
    setShouldAutoScroll(true)

    try {
      console.log("[v0] Loading all messages from cache...")
      const cachedMessages = await messageCache.getMessages(currentUserId, user.id)

      if (cachedMessages.length > 0) {
        console.log("[v0] Loaded", cachedMessages.length, "messages from cache")
        setAllCachedMessages(cachedMessages)
        setMessages(cachedMessages.slice(-15))
        setDisplayedCount(15)
        setTotalCount(cachedMessages.length)
        setHasMoreMessages(cachedMessages.length > 15)
        setIsLoading(false)
        setShouldAutoScroll(true)
      }

      console.log("[v0] Fetching fresh messages from Supabase...")
      const result = await fetchMessagesAction(currentUserId, user.id, true, 1000, 0)

      if (result.error) {
        console.error("[v0] Error fetching messages:", result.error)
      } else {
        console.log("[v0] Fetched", result.messages.length, "messages from Supabase")

        await messageCache.setMessages(currentUserId, user.id, result.messages)
        console.log("[v0] Updated cache with fresh messages")

        setAllCachedMessages(result.messages)
        setMessages(result.messages.slice(-displayedCount))
        setTotalCount(result.messages.length)
        setHasMoreMessages(result.messages.length > displayedCount)
        setShouldAutoScroll(true)
      }
    } catch (error) {
      console.error("[v0] Error in handleSelectUser:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!selectedUser || isLoadingMore || !hasMoreMessages) return

    setIsLoadingMore(true)

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      setIsLoadingMore(false)
      return
    }

    previousScrollHeightRef.current = scrollContainer.scrollHeight
    isRestoringScrollRef.current = true

    console.log("[v0] Loading more messages from cache - current displayed:", displayedCount)

    const newDisplayedCount = displayedCount + 15
    const newMessages = allCachedMessages.slice(-newDisplayedCount)

    setMessages(newMessages)
    setDisplayedCount(newDisplayedCount)
    setHasMoreMessages(newDisplayedCount < allCachedMessages.length)
    setIsLoadingMore(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      handleLoadMore()
    }
  }

  const handleSendMessage = async (formData: FormData) => {
    if (!selectedUser) return { error: "No user selected" }

    formData.append("receiverId", selectedUser.id)
    const result = await sendMessageAction(formData)

    if (result.success) {
      try {
        const shouldScroll = isNearBottom()

        const messagesResult = await fetchMessagesAction(currentUserId, selectedUser.id, false)

        if (messagesResult && !messagesResult.error && messagesResult.messages && messagesResult.messages.length > 0) {
          setMessages((prevMessages) => {
            const existingIds = new Set(prevMessages.map((msg) => msg.id))
            const newMessages = messagesResult.messages.filter((msg) => !existingIds.has(msg.id))
            if (newMessages.length > 0) {
              newMessages.forEach((msg) => {
                messageCache.addMessage(currentUserId, selectedUser.id, msg).catch(console.error)
              })
              setAllCachedMessages((prev) => [...prev, ...newMessages])
              if (shouldScroll) {
                setShouldAutoScroll(true)
              }
              return [...prevMessages, ...newMessages]
            }
            return prevMessages
          })
        }
      } catch (error) {
        console.error("[MessagesClient] Error fetching messages after send:", error)
      }
    }

    return result
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim()
    }
    return user.email
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const groupMessagesByBundle = (messages: Message[]) => {
    const bundles: { [key: string]: Message[] } = {}
    const unbundled: Message[] = []

    messages.forEach((message) => {
      if (message.bundle_id) {
        if (!bundles[message.bundle_id]) {
          bundles[message.bundle_id] = []
        }
        bundles[message.bundle_id].push(message)
      } else {
        unbundled.push(message)
      }
    })

    const bundleArray = Object.values(bundles)

    const allGroups = [
      ...bundleArray.map((bundle) => ({
        messages: bundle,
        date: bundle[0].date_sent,
        isBundle: true,
      })),
      ...unbundled.map((msg) => ({
        messages: [msg],
        date: msg.date_sent,
        isBundle: false,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return allGroups
  }

  const messageGroups = groupMessagesByBundle(messages)

  const isNearBottom = () => {
    if (!scrollContainerRef.current) return false
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    return scrollTop + clientHeight >= scrollHeight - 300
  }

  const handleBackToList = () => {
    setShowMobileMessages(false)
    setSelectedUser(null)
  }

  const handleToggleGallery = () => {
    if (!showGallery && scrollContainerRef.current) {
      // Save scroll position before opening gallery
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop
    }
    setShowGallery(!showGallery)
  }

  return (
    <>
      <OfflineIndicator />

      <div
        className={`grid gap-0 relative overflow-hidden ${hasSingleContact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[320px_1fr]"}`}
      >
        {/* Users panel - hidden when there's only one contact */}
        {!hasSingleContact && (
          <div className={`${showMobileMessages ? "hidden md:block" : "block"}`}>
            <MessageList
              users={otherUsers}
              selectedUserId={selectedUser?.id}
              onSelectUser={handleSelectUser}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
            />
          </div>
        )}

        {/* Messages panel - slides in from right on mobile */}
        <div
          className={`
            fixed md:relative inset-0 md:inset-auto z-50 md:z-auto
            transition-transform duration-300 ease-in-out
            overflow-hidden
            ${showMobileMessages ? "translate-x-0" : "translate-x-full md:translate-x-0"}
          `}
        >
          <Card className="flex flex-col rounded-none shadow-none h-screen py-0 gap-0 w-full min-w-0">
            {!showGallery && (
              <MessageHeader
                selectedUser={selectedUser}
                onHeaderClick={handleToggleGallery}
                onBack={handleBackToList}
                showBackButton={showMobileMessages && !hasSingleContact}
              />
            )}
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0 w-full min-w-0 relative">
              <div
                className={`
                  fixed inset-0 z-[60]
                  transition-transform duration-300 ease-in-out
                  bg-background
                  ${showGallery ? "translate-x-0" : "translate-x-full"}
                  ${!showGallery ? "pointer-events-none" : ""}
                `}
              >
                {selectedUser && (
                  <MessageGallery
                    currentUserId={currentUserId}
                    selectedUserId={selectedUser.id}
                    fetchMessagesAction={fetchMessagesAction}
                    onClose={handleToggleGallery}
                  />
                )}
              </div>

              {/* Messages content */}
              <div
                className={`flex-1 overflow-y-auto w-full min-w-0 md:pb-0` + (showGallery ? " hidden md:flex" : " flex")}
                onScroll={handleScroll}
                ref={scrollContainerRef}
              >
                {!selectedUser ? (
                  <div className="text-center text-muted-foreground text-sm py-8">Select a user to start chatting</div>
                ) : isLoading ? (
                  <div className="text-center text-muted-foreground text-sm py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  <div className="space-y-4 px-2 sm:px-4 py-4 w-full min-w-0">
                    {isLoadingMore && (
                      <div className="text-center text-muted-foreground text-xs py-2">Loading older messages...</div>
                    )}
                    {messageGroups.map((group, groupIndex) => {
                      const firstMessage = group.messages[0]
                      const isCurrentUser = firstMessage.user_id === currentUserId

                      const sender = !isCurrentUser ? users.find((u) => u.id === firstMessage.user_id) : null
                      const senderName = sender ? getDisplayName(sender) : undefined
                      const senderInitials = sender ? getInitials(sender.first_name, sender.last_name) : undefined

                      return (
                        <MessageBubble
                          key={groupIndex}
                          messages={group.messages}
                          isCurrentUser={isCurrentUser}
                          senderName={senderName}
                          senderInitials={senderInitials}
                        />
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Input bar */}
              {selectedUser && (
                <MessageInput userId={authUserId} sendMessageAction={handleSendMessage} receiverId={selectedUser.id} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
