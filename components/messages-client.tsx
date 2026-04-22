"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Users } from "lucide-react"
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

    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: { new: Message }) => {
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
            if (prevMessages.some((msg) => msg.id === newMessage.id)) {
              console.log("[v0] Message already exists, skipping duplicate")
              return prevMessages
            }

            console.log("[v0] Adding new message from realtime subscription")

            messageCache.addMessage(currentUserId, selectedUser.id, newMessage).catch(console.error)
            setAllCachedMessages((prev) => [...prev, newMessage])

            if (shouldScroll) {
              setShouldAutoScroll(true)
            }

            return [...prevMessages, newMessage]
          })
        },
      )
      .subscribe((status: string) => {
  console.log("[v0] Realtime subscription status:", status)
})

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
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop
    }
    setShowGallery(!showGallery)
  }

  return (
    <>
      <OfflineIndicator />

      <div className="h-full bg-black text-zinc-100">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Communications
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">
                  Project Messages
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-medium text-zinc-300">
                  <Users className="h-4 w-4" />
                  <span>{otherUsers.length} contacts</span>
                </div>
                {selectedUser ? (
                  <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-100">
                    <MessageSquare className="h-4 w-4" />
                    <span>{getDisplayName(selectedUser)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4">
            <div
              className={`relative grid h-full min-h-0 overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950 ${
                hasSingleContact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]"
              }`}
            >
              {!hasSingleContact && (
                <div className={`${showMobileMessages ? "hidden md:block" : "block"} min-h-0 border-r border-zinc-800 bg-black`}>
                  <div className="border-b border-zinc-800 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Contacts
                    </div>
                    <div className="mt-2 text-sm font-semibold text-zinc-100">
                      Message Directory
                    </div>
                  </div>

                  <div className="min-h-0 h-[calc(100%-73px)] overflow-hidden">
                    <MessageList
                      users={otherUsers}
                      selectedUserId={selectedUser?.id}
                      onSelectUser={handleSelectUser}
                      currentUserRole={currentUserRole}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              )}

              <div
                className={`
                  fixed inset-0 z-50 overflow-hidden bg-zinc-950 md:relative md:inset-auto md:z-auto md:bg-transparent
                  transition-transform duration-300 ease-in-out
                  ${showMobileMessages ? "translate-x-0" : "translate-x-full md:translate-x-0"}
                `}
              >
                <div className="flex h-full min-h-0 flex-col bg-zinc-950">
                  {!showGallery && (
                    <div className="border-b border-zinc-800 bg-zinc-950">
                      <MessageHeader
                        selectedUser={selectedUser}
                        onHeaderClick={handleToggleGallery}
                        onBack={handleBackToList}
                        showBackButton={showMobileMessages && !hasSingleContact}
                      />
                    </div>
                  )}

                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div
                      className={`
                        fixed inset-0 z-[60] bg-black
                        transition-transform duration-300 ease-in-out
                        ${showGallery ? "translate-x-0" : "translate-x-full"}
                        ${!showGallery ? "pointer-events-none" : ""}
                      `}
                    >
                      {selectedUser ? (
                        <MessageGallery
                          currentUserId={currentUserId}
                          selectedUserId={selectedUser.id}
                          fetchMessagesAction={fetchMessagesAction}
                          onClose={handleToggleGallery}
                        />
                      ) : null}
                    </div>

                    <div
                      className={`min-h-0 flex-1 overflow-y-auto bg-[#0d1118] ${
                        showGallery ? "hidden md:flex" : "flex"
                      }`}
                      onScroll={handleScroll}
                      ref={scrollContainerRef}
                    >
                      {!selectedUser ? (
                        <div className="flex w-full items-center justify-center p-8">
                          <div className="max-w-md rounded-2xl border border-zinc-800 bg-black px-6 py-10 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                              <MessageSquare className="h-5 w-5 text-zinc-400" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-zinc-200">
                              Select a contact to open the conversation
                            </p>
                            <p className="mt-2 text-sm text-zinc-500">
                              Messages, files, receipts, timecards, and updates will appear here.
                            </p>
                          </div>
                        </div>
                      ) : isLoading ? (
                        <div className="flex w-full items-center justify-center p-8">
                          <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
                            Loading messages...
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex w-full items-center justify-center p-8">
                          <div className="rounded-2xl border border-zinc-800 bg-black px-6 py-10 text-center">
                            <p className="text-sm font-medium text-zinc-200">
                              No messages yet
                            </p>
                            <p className="mt-2 text-sm text-zinc-500">
                              Start the conversation from the composer below.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full min-w-0 px-3 py-4 sm:px-4">
                          {isLoadingMore ? (
                            <div className="pb-3 text-center text-xs text-zinc-500">
                              Loading older messages...
                            </div>
                          ) : null}

                          <div className="space-y-4">
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
                        </div>
                      )}
                    </div>

                    {selectedUser ? (
                      <div className="border-t border-zinc-800 bg-zinc-950">
                        <MessageInput
                          userId={authUserId}
                          sendMessageAction={handleSendMessage}
                          receiverId={selectedUser.id}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
