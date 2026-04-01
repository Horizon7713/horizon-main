import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const getRandomAvatarColor = (): "blue" | "red" | "green" | "purple" | "pink" => {
  const colors: ("blue" | "red" | "green" | "purple" | "pink")[] = ["blue", "red", "green", "purple", "pink"]
  return colors[Math.floor(Math.random() * colors.length)]
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Starting signup process...")

    const { email, password, firstName, lastName, company, role } = await request.json()

    console.log("[v0] Signup attempt for email:", email)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeGJ0ZXJvYnphZHVjemFzdW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI0MTU4OCwiZXhwIjoyMDc1ODE3NTg4fQ.m20IIQxV2bf57SYVBn3JU82rN7V1Caxcjp3WhO9G1gY"

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[v0] Missing Supabase credentials:", { url: !!supabaseUrl, key: !!serviceRoleKey })
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const avatarColor = getRandomAvatarColor()
    console.log("[v0] Assigned avatar color:", avatarColor)

    console.log("[v0] Checking for orphaned profiles...")
    const { data: orphanedProfile } = await supabase.from("users").select("*").eq("email", email).maybeSingle()

    if (orphanedProfile) {
      console.log("[v0] Found orphaned profile, checking if auth user exists...")
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const authUserExists = authUsers?.users.find((u) => u.id === orphanedProfile.auth_id)

      if (!authUserExists) {
        console.log("[v0] Orphaned profile confirmed (no matching auth user), deleting...")
        await supabase.from("users").delete().eq("email", email)
        console.log("[v0] Orphaned profile deleted")
      }
    }

    console.log("[v0] Checking for existing auth user...")
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.log("[v0] Error listing auth users:", listError)
    }

    const existingAuthUser = authUsers?.users.find((u) => u.email === email)
    console.log("[v0] Existing auth user found:", !!existingAuthUser)

    if (existingAuthUser) {
      // Auth user exists - check if profile exists
      console.log("[v0] Auth user exists, checking for profile...")
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", existingAuthUser.id)
        .maybeSingle()

      console.log("[v0] Profile query result:", { found: !!profile, error: profileError })

      if (profile) {
        return NextResponse.json(
          { error: "A user with this email already exists. Please try logging in." },
          { status: 409 },
        )
      }

      // Auth exists but no profile - create profile
      console.log("[v0] Creating profile for existing auth user...")
      const { error: insertError } = await supabase.from("users").insert({
        auth_id: existingAuthUser.id,
        email,
        first_name: firstName,
        last_name: lastName,
        company,
        role,
        avatar_color: avatarColor,
      })

      if (insertError) {
        console.log("[v0] Profile creation failed:", insertError)
        return NextResponse.json({ error: "Failed to create user profile: " + insertError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: "User profile created successfully",
        user: existingAuthUser,
      })
    }

    console.log("[v0] Creating new auth user...")
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.log("[v0] Auth user creation failed:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Auth user created successfully:", authData.user.id)

    console.log("[v0] Creating user profile...")
    const { error: profileError } = await supabase.from("users").insert({
      auth_id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      role,
      avatar_color: avatarColor,
    })

    // If duplicate key error, delete orphaned profile and retry
    if (profileError && profileError.code === "23505") {
      console.log("[v0] Duplicate key error detected, deleting orphaned profile and retrying...")

      // Delete orphaned profile by email
      const { error: deleteError } = await supabase.from("users").delete().eq("email", email)

      if (deleteError) {
        console.log("[v0] Failed to delete orphaned profile:", deleteError)
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: "Failed to clean up orphaned data: " + deleteError.message }, { status: 400 })
      }

      console.log("[v0] Orphaned profile deleted successfully, retrying profile creation...")

      // Retry profile creation
      const { error: retryError } = await supabase.from("users").insert({
        auth_id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        company,
        role,
        avatar_color: avatarColor,
      })

      if (retryError) {
        console.log("[v0] Retry failed:", retryError)
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: "Failed to create user profile after retry: " + retryError.message },
          { status: 400 },
        )
      }

      console.log("[v0] Profile created successfully on retry!")

      // Return success immediately after successful retry
      return NextResponse.json({
        success: true,
        message: "User created successfully",
        user: authData.user,
      })
    }

    if (profileError) {
      console.log("[v0] Profile creation failed:", profileError)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile: " + profileError.message }, { status: 400 })
    }

    console.log("[v0] Profile created successfully!")
    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: authData.user,
    })
  } catch (error) {
    console.error("[v0] Unexpected error in signup:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
