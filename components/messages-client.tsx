"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
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
import { LanguageToggle } from "@/components/language/language-toggle"

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
  original_content?: string | null
  original_language?: "en" | "es" | string | null
  translated_content?: Record<string, string> | null
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

type MessageGroup = {
  messages: Message[]
  date: string
  isBundle: boolean
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
  const [showMobileMessages, setShowMobileMessages] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef(0)
  const isRestoringScrollRef = useRef(false)
  const savedScrollPositionRef = useRef(0)

  const otherUsers = users.filter((user) => user.id !== currentUserId)
  const currentUser = users.find((user) => user.id === currentUserId)
  const currentUserRole = currentUser?.role || null
  const hasSingleContact = otherUsers.length === 1

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current

      if (!container) return

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      })
    })
  }

  const isNearBottom = () => {
    const container = scrollContainerRef.current

    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container

    return scrollTop + clientHeight >= scrollHeight - 300
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

  const groupMessagesByBundle = (items: Message[]): MessageGroup[] => {
    const bundles: Record<string, Message[]> = {}
    const unbundled: Message[] = []

    items.forEach((message) => {
      if (message.bundle_id) {
        if (!bundles[message.bundle_id]) {
          bundles[message.bundle_id] = []
        }

        bundles[message.bundle_id].push(message)
        return
      }

      unbundled.push(message)
    })

    return [
      ...Object.values(bundles).map((bundle) => ({
        messages: bundle,
        date: bundle[0]?.date_sent || "",
        isBundle: true,
      })),
      ...unbundled.map((message) => ({
        messages: [message],
        date: message.date_sent,
        isBundle: false,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const messageGroups = groupMessagesByBundle(messages)

  useEffect(() => {
    if (hasSingleContact && !selectedUser && otherUsers.length > 0) {
      handleSelectUser(otherUsers[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSingleContact, selectedUser, otherUsers.length])

  useEffect(() => {
  const shouldLockBodyScroll = showMobileMessages || hasSingleContact

  if (!shouldLockBodyScroll) return

  const originalOverflow = document.body.style.overflow
  const originalHtmlOverflow = document.documentElement.style.overflow

  document.body.style.overflow = "hidden"
  document.documentElement.style.overflow = "hidden"

  return () => {
    document.body.style.overflow = originalOverflow
    document.documentElement.style.overflow = originalHtmlOverflow
  }
}, [showMobileMessages, hasSingleContact])

  useEffect(() => {
    if (!selectedUser) return

    const channel = supabase
      .channel(`messages-changes-${currentUserId}-${selectedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new

          const isRelevant =
            (newMessage.user_id === currentUserId && newMessage.receiver_id === selectedUser.id) ||
            (newMessage.user_id === selectedUser.id && newMessage.receiver_id === currentUserId)

          if (!isRelevant) return

          const shouldScroll = isNearBottom()

          setMessages((previousMessages) => {
            if (previousMessages.some((message) => message.id === newMessage.id)) {
              return previousMessages
            }

            messageCache.addMessage(currentUserId, selectedUser.id, newMessage).catch(console.error)

            setAllCachedMessages((previousCachedMessages) => {
              if (previousCachedMessages.some((message) => message.id === newMessage.id)) {
                return previousCachedMessages
              }

              return [...previousCachedMessages, newMessage]
            })

            if (shouldScroll || newMessage.user_id === currentUserId) {
              setShouldAutoScroll(true)
            }

            return [...previousMessages, newMessage]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, selectedUser])

  useEffect(() => {
    if (!isRestoringScrollRef.current || !scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const heightDifference = scrollContainer.scrollHeight - previousScrollHeightRef.current

    scrollContainer.scrollTop = scrollContainer.scrollTop + heightDifference
    isRestoringScrollRef.current = false
  }, [messages])

  useEffect(() => {
    if (!shouldAutoScroll || isLoading || messages.length === 0) return

    scrollMessagesToBottom("auto")
    setShouldAutoScroll(false)
  }, [shouldAutoScroll, isLoading, messages.length])

  useEffect(() => {
    if (showGallery || savedScrollPositionRef.current <= 0) return

    requestAnimationFrame(() => {
      const container = scrollContainerRef.current

      if (!container) return

      container.scrollTop = savedScrollPositionRef.current
      savedScrollPositionRef.current = 0
    })
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
    setHasMoreMessages(false)
    setShouldAutoScroll(true)

    try {
      const cachedMessages = await messageCache.getMessages(currentUserId, user.id)

      if (cachedMessages.length > 0) {
        setAllCachedMessages(cachedMessages)
        setMessages(cachedMessages.slice(-15))
        setDisplayedCount(15)
        setHasMoreMessages(cachedMessages.length > 15)
        setShouldAutoScroll(true)
      }

      const result = await fetchMessagesAction(currentUserId, user.id, true, 1000, 0)

      if (result.error) {
        console.error("[MessagesClient] Error fetching messages:", result.error)
        return
      }

      await messageCache.setMessages(currentUserId, user.id, result.messages)

      setAllCachedMessages(result.messages)
      setMessages(result.messages.slice(-15))
      setDisplayedCount(15)
      setHasMoreMessages(result.messages.length > 15)
      setShouldAutoScroll(true)
    } catch (error) {
      console.error("[MessagesClient] Error selecting user:", error)
    } finally {
      setIsLoading(false)
      setShouldAutoScroll(true)
      scrollMessagesToBottom("auto")
    }
  }

  const handleLoadMore = async () => {
    if (!selectedUser || isLoadingMore || !hasMoreMessages) return

    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) return

    setIsLoadingMore(true)

    previousScrollHeightRef.current = scrollContainer.scrollHeight
    isRestoringScrollRef.current = true

    const newDisplayedCount = displayedCount + 15
    const newMessages = allCachedMessages.slice(-newDisplayedCount)

    setMessages(newMessages)
    setDisplayedCount(newDisplayedCount)
    setHasMoreMessages(newDisplayedCount < allCachedMessages.length)
    setIsLoadingMore(false)
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget

    if (target.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      handleLoadMore()
    }
  }

  const handleSendMessage = async (formData: FormData) => {
    if (!selectedUser) return { error: "No user selected" }

    formData.append("receiverId", selectedUser.id)

    const result = await sendMessageAction(formData)

    if (!result.success) {
      return result
    }

    try {
      const messagesResult = await fetchMessagesAction(currentUserId, selectedUser.id, false)

      if (!messagesResult || messagesResult.error || !messagesResult.messages?.length) {
        setShouldAutoScroll(true)
        return result
      }

      setMessages((previousMessages) => {
        const existingIds = new Set(previousMessages.map((message) => message.id))
        const newMessages = messagesResult.messages.filter((message) => !existingIds.has(message.id))

        if (newMessages.length === 0) {
          setShouldAutoScroll(true)
          return previousMessages
        }

        newMessages.forEach((message) => {
          messageCache.addMessage(currentUserId, selectedUser.id, message).catch(console.error)
        })

        setAllCachedMessages((previousCachedMessages) => {
          const cachedIds = new Set(previousCachedMessages.map((message) => message.id))
          const uniqueNewMessages = newMessages.filter((message) => !cachedIds.has(message.id))

          return [...previousCachedMessages, ...uniqueNewMessages]
        })

        setShouldAutoScroll(true)

        return [...previousMessages, ...newMessages]
      })

      scrollMessagesToBottom("smooth")
    } catch (error) {
      console.error("[MessagesClient] Error fetching messages after send:", error)
      setShouldAutoScroll(true)
    }

    return result
  }

  const handleBackToList = () => {
    setShowMobileMessages(false)
    setSelectedUser(null)
  }

  const handleToggleGallery = () => {
    if (!showGallery && scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop
    }

    setShowGallery((previous) => !previous)
  }

  return (
    <>
      <OfflineIndicator />

      <div className="h-full min-h-0 overflow-hidden bg-black text-zinc-100">
        <div className="flex h-full min-h-0 flex-col">
          <div className="hidden shrink-0 border-b border-zinc-800 bg-zinc-950 md:block">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Communications
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">Project Messages</div>
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

          <div className="min-h-0 flex-1 overflow-hidden p-0 md:p-4">
            <div
              className={`relative grid h-full min-h-0 overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950 ${
                hasSingleContact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]"
              }`}
            >
              {!hasSingleContact ? (
                <div
                  className={`${
                    showMobileMessages ? "hidden md:block" : "block"
                  } min-h-0 border-r border-zinc-800 bg-black`}
                >
                  <div className="shrink-0 border-b border-zinc-800 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Contacts
                    </div>
                    <div className="mt-2 text-sm font-semibold text-zinc-100">Message Directory</div>
                  </div>

                  <div className="h-[calc(100%-73px)] min-h-0 overflow-hidden">
                    <MessageList
                      users={otherUsers}
                      selectedUserId={selectedUser?.id}
                      onSelectUser={handleSelectUser}
                      currentUserRole={currentUserRole}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              ) : null}

              <div
  className={`
    fixed inset-x-0 bottom-0 top-0 z-40 flex h-[100dvh] min-h-0 flex-col overflow-hidden overscroll-none bg-zinc-950
md:relative md:inset-auto md:top-auto md:bottom-auto md:z-auto md:h-full md:bg-transparent
    transition-transform duration-300 ease-in-out
    ${showMobileMessages || hasSingleContact ? "translate-x-0" : "translate-x-full md:translate-x-0"}
  `}
>
                <div className="flex h-full min-h-0 flex-col bg-zinc-950">
                  {!showGallery ? (
                    <div className="shrink-0 border-b border-zinc-800 bg-zinc-950">
                      <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
                        <div className="min-w-0 flex-1">
                          <MessageHeader
                            selectedUser={selectedUser}
                            onHeaderClick={handleToggleGallery}
                            onBack={handleBackToList}
                            showBackButton={showMobileMessages && !hasSingleContact}
                          />
                        </div>

                        <div className="shrink-0">
                          <LanguageToggle />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div
                      className={`
                        fixed inset-x-0 bottom-0 top-16 z-[45] bg-black
                        transition-transform duration-300 ease-in-out
                        md:absolute md:inset-0
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
  className={`min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#0d1118] ${
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
                            <p className="text-sm font-medium text-zinc-200">No messages yet</p>
                            <p className="mt-2 text-sm text-zinc-500">
                              Start the conversation from the composer below.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full min-w-0 px-3 pb-4 pt-4 sm:px-4 sm:pb-6">
                          {isLoadingMore ? (
                            <div className="pb-3 text-center text-xs text-zinc-500">
                              Loading older messages...
                            </div>
                          ) : null}

                          <div className="space-y-4">
                            {messageGroups.map((group, groupIndex) => {
                              const firstMessage = group.messages[0]
                              const isCurrentUser = firstMessage.user_id === currentUserId
                              const sender = !isCurrentUser
                                ? users.find((user) => user.id === firstMessage.user_id)
                                : null
                              const senderName = sender ? getDisplayName(sender) : undefined
                              const senderInitials = sender
                                ? getInitials(sender.first_name, sender.last_name)
                                : undefined

                              const uniqueGroupMessages = group.messages.filter(
                                (message, index, array) =>
                                  index === array.findIndex((other) => other.id === message.id),
                              )

                              return (
                                <MessageBubble
                                  key={
                                    uniqueGroupMessages.map((message) => message.id).join("-") ||
                                    `${group.date}-${groupIndex}`
                                  }
                                  messages={uniqueGroupMessages}
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
                      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950">
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
