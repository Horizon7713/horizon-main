import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { MessagesClient } from "@/components/messages-client"

async function sendMessage(formData: FormData) {
  "use server"

  const content = formData.get("content") as string
  const authUserId = formData.get("userId") as string
  const receiverId = formData.get("receiverId") as string
  const bundleId = formData.get("bundleId") as string
  const fileDataJson = formData.get("fileData") as string
  const currentProject = formData.get("currentProject") as string
  const messageType = formData.get("messageType") as string
const progressUpdate = formData.get("progressUpdate") as string
const durationMinutes = formData.get("durationMinutes") as string
const totalPrice = formData.get("totalPrice") as string
const itemsPurchasedJson = formData.get("itemsPurchased") as string
const category = formData.get("category") as string
const vendorName = formData.get("vendorName") as string

  const originalContent = String(formData.get("originalContent") || content || "").trim()
  const originalLanguage = String(formData.get("originalLanguage") || "en")
  const translatedContentRaw = String(formData.get("translatedContent") || "{}")

  let translatedContent: Record<string, string> = {}

  try {
    translatedContent = JSON.parse(translatedContentRaw)
  } catch {
    translatedContent = {}
  }

  if (originalContent && Object.keys(translatedContent).length === 0) {
    translatedContent = {
      [originalLanguage]: originalContent,
    }
  }

  if ((!content && !fileDataJson) || !authUserId || !receiverId || !bundleId) {
    return { error: "Missing required fields" }
  }

  const supabase = await createClient()

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .single()

  if (profileError || !userProfile) {
    console.error("[v0] Error finding user profile:", profileError)
    return { error: "User profile not found" }
  }

  const fileData: Array<{ url: string; mimeType: string }> = fileDataJson ? JSON.parse(fileDataJson) : []

  const messagesToInsert = []

  if (content && content.trim()) {
    messagesToInsert.push({
      content: content.trim(),
      type: messageType || "text",
      user_id: userProfile.id,
      receiver_id: receiverId,
      date_sent: new Date().toISOString(),
      status: "sent",
      bundle_id: bundleId,
      file_url: null,
      mime_type: null,
      current_project: currentProject || null,
      progress_update: progressUpdate || null,
      original_content: originalContent || content.trim(),
      original_language: originalLanguage,
      translated_content: translatedContent,
    })
  }

  for (const file of fileData) {
    messagesToInsert.push({
      content: "",
      type: messageType || "file",
      user_id: userProfile.id,
      receiver_id: receiverId,
      date_sent: new Date().toISOString(),
      status: "sent",
      bundle_id: bundleId,
      file_url: file.url,
      mime_type: file.mimeType,
      current_project: currentProject || null,
      progress_update: progressUpdate || null,
      original_content: null,
      original_language: originalLanguage,
      translated_content: {},
    })
  }

  if (messagesToInsert.length === 0) {
    return { error: "No messages to send" }
  }

  const { error } = await supabase.from("messages").insert(messagesToInsert)

  if (error) {
    console.error("[v0] Error sending message:", error)
    return { error: error.message }
  }

  if (messageType === "media" && currentProject && fileData.length > 0) {
    const mediaEntries = fileData.map((file) => ({
      project_id: currentProject,
      uploaded_by: userProfile.id,
      file_url: file.url,
      mime_type: file.mimeType,
      caption: content?.trim() || null,
      message_bundle: bundleId,
    }))

    const { error: mediaError } = await supabase.from("media").insert(mediaEntries)

    if (mediaError) {
      console.error("[v0] Error creating media entries:", mediaError)
    } else {
      console.log("[v0] Successfully created", mediaEntries.length, "media entries for project:", currentProject)
    }
  }

  if (messageType === "timecard" && currentProject && progressUpdate) {
  const { error: timecardError } = await supabase.from("timecards").insert({
    uploaded_by: userProfile.id,
    work_type: progressUpdate,
    notes: content?.trim() || null,
    project_id: currentProject,
    message_bundle: bundleId,
    duration_minutes: durationMinutes ? Number(durationMinutes) : null,
  })

    if (timecardError) {
      console.error("[v0] Error creating timecard entry:", timecardError)
    } else {
      console.log("[v0] Successfully created timecard entry for project:", currentProject)
    }
  }

  if (messageType === "receipt" && totalPrice && currentProject) {
    const { data: receiptData, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        uploaded_by: userProfile.id,
        total_price: Number.parseFloat(totalPrice),
        project: currentProject,
        message_bundle: bundleId,
        category: category || null,
        vender_name: vendorName || null,
      })
      .select("id")
      .single()

    if (receiptError) {
      console.error("[v0] Error creating receipt entry:", receiptError)
    } else if (receiptData && itemsPurchasedJson) {
      try {
        const itemsPurchased = JSON.parse(itemsPurchasedJson)
        if (Array.isArray(itemsPurchased) && itemsPurchased.length > 0) {
          const breakdownItems = itemsPurchased.map((item: any) => ({
            receipt_id: receiptData.id,
            name: item.name || "",
            quantity: item.quantity || 1,
            price: item.price || 0,
            type: null,
          }))

          const { error: breakdownError } = await supabase.from("receipts_breakdown").insert(breakdownItems)

          if (breakdownError) {
            console.error("[v0] Error inserting receipt breakdown items:", breakdownError)
          } else {
            console.log("[v0] Successfully inserted", breakdownItems.length, "receipt items")
          }
        }
      } catch (err) {
        console.error("[v0] Error parsing items purchased:", err)
      }
    }
  }

  return { success: true }
}

async function fetchMessages(
  userId: string,
  otherUserId: string,
  initialLoad = false,
  limit?: number,
  offset?: number,
  since?: string,
) {
  "use server"

  const supabase = await createClient()

  let query = supabase
    .from("messages")
    .select(
      `
      id,
      content,
      type,
      date_sent,
      status,
      user_id,
      receiver_id,
      file_url,
      bundle_id,
      mime_type,
            current_project,
      progress_update,
      original_content,
      original_language,
      translated_content
    `,
      { count: "exact" },
    )
    .or(
      `and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("date_sent", { ascending: false })

  if (since) {
    query = query.gt("date_sent", since)
  }

  if (limit !== undefined && offset !== undefined) {
    query = query.limit(limit).range(offset, offset + limit - 1)
  } else if (limit !== undefined) {
    query = query.limit(limit)
  }

  const { data: messages, error, count } = await query

  if (error) {
    console.error("[v0] Error fetching messages:", error)
    return { error: error.message, messages: [], totalCount: 0 }
  }

  const sortedMessages = messages ? [...messages].reverse() : []

  return { messages: sortedMessages, totalCount: count || 0 }
}

export default async function MessagesPage() {
  const supabase = await createClient()

  console.log("[v0] MessagesPage: Starting page render")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  console.log("[v0] MessagesPage: User authenticated:", user.id)

  const { data: currentUserProfile } = await supabase.from("users").select("id, role").eq("auth_id", user.id).single()

  console.log("[v0] MessagesPage: Current user profile:", currentUserProfile)

  let allowedContactIds: string[] | null = null

  if (currentUserProfile?.id) {
    console.log("[v0] Checking if user is a homeowner...")
    const { data: homeownerRecord, error: homeownerError } = await supabase
      .from("homeowners")
      .select("contractor_id")
      .eq("homeowner_user_id", currentUserProfile.id)
      .maybeSingle()

    console.log("[v0] Homeowner query result:", { homeownerRecord, homeownerError })

    if (homeownerRecord?.contractor_id) {
      console.log("[v0] User is a homeowner with contractor_id:", homeownerRecord.contractor_id)
      // User is a homeowner, find their contractor's user_id
      const { data: contractorRecord, error: contractorError } = await supabase
        .from("contractors")
        .select("contractor_user_id")
        .eq("id", homeownerRecord.contractor_id)
        .maybeSingle()

      console.log("[v0] Contractor lookup result:", { contractorRecord, contractorError })

      if (contractorRecord?.contractor_user_id) {
        // Only show the contractor in the contact list
        allowedContactIds = [contractorRecord.contractor_user_id]
        console.log("[v0] User is homeowner, showing only contractor:", contractorRecord.contractor_user_id)
      } else {
        console.log("[v0] Could not find contractor with id:", homeownerRecord.contractor_id, "Error:", contractorError)
      }
    } else {
      console.log("[v0] User is not a homeowner, checking if user is a subcontractor...")

      const { data: subcontractorRecord, error: subcontractorError } = await supabase
        .from("subcontractors")
        .select("contractor_id")
        .eq("subcontractor_user_id", currentUserProfile.id)
        .maybeSingle()

      console.log("[v0] Subcontractor query result:", { subcontractorRecord, subcontractorError })

      if (subcontractorRecord?.contractor_id) {
        console.log("[v0] User is a subcontractor with contractor_id:", subcontractorRecord.contractor_id)

        // User is a subcontractor, find their contractor's user_id
        const { data: contractorRecord, error: contractorError } = await supabase
          .from("contractors")
          .select("contractor_user_id")
          .eq("id", subcontractorRecord.contractor_id)
          .maybeSingle()

        console.log("[v0] Contractor lookup for subcontractor:", { contractorRecord, contractorError })

        // Only show the contractor in the contact list
        if (contractorRecord?.contractor_user_id) {
          allowedContactIds = [contractorRecord.contractor_user_id]
          console.log("[v0] Subcontractor can only see contractor:", contractorRecord.contractor_user_id)
        }
      } else {
        console.log("[v0] User is not a subcontractor, checking employee status...")

        // Check if user is an employee in contractors table
        const { data: contractorEmployment } = await supabase
          .from("contractors")
          .select("contractor_user_id, employees")
          .filter("employees", "cs", JSON.stringify([currentUserProfile.id]))
          .limit(1)
          .maybeSingle()

        if (contractorEmployment) {
          // User is an employee of a contractor, only show the contractor
          allowedContactIds = [contractorEmployment.contractor_user_id]
          console.log("[v0] User is employee of contractor:", contractorEmployment.contractor_user_id)
        } else {
          // Check if user is an employee in subcontractors table
          const { data: subcontractorEmployment } = await supabase
            .from("subcontractors")
            .select("subcontractor_user_id, employees")
            .filter("employees", "cs", JSON.stringify([currentUserProfile.id]))
            .limit(1)
            .maybeSingle()

          if (subcontractorEmployment) {
            // User is an employee of a subcontractor, only show the subcontractor
            allowedContactIds = [subcontractorEmployment.subcontractor_user_id]
            console.log("[v0] User is employee of subcontractor:", subcontractorEmployment.subcontractor_user_id)
          } else {
            console.log("[v0] User is not an employee, showing all contacts")
          }
        }
      }
    }
  }

  // Fetch users with optional filtering based on role
  let usersQuery = supabase
    .from("users")
    .select("id, first_name, last_name, email, company, role, avatar_color")
    .order("first_name", { ascending: true })

  if (allowedContactIds) {
    console.log("[v0] Filtering contacts to allowed IDs:", allowedContactIds)
    usersQuery = usersQuery.in("id", allowedContactIds)
  }

  const { data: users, error: usersError } = await usersQuery

  if (usersError) {
    console.error("[v0] Error fetching users:", usersError)
  }

  console.log(
    "[v0] Final users list:",
    users?.map((u) => ({ email: u.email, id: u.id, role: u.role })),
  )

  return (
  <div className="h-screen bg-black text-zinc-100">
    <MessagesClient
      users={users || []}
      currentUserId={currentUserProfile?.id || ""}
      authUserId={user.id}
      sendMessageAction={sendMessage}
      fetchMessagesAction={fetchMessages}
    />
  </div>
)
}