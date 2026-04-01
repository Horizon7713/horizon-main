"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    company: "",
    role: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchRoles = async () => {
      console.log("[v0] Fetching roles from Supabase...")
      const { data, error } = await supabase.from("roles").select("id, name").order("name", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching roles:", error)
      } else if (data) {
        console.log("[v0] Fetched roles:", data)
        setRoles(data)
        console.log("[v0] Roles state updated, count:", data.length)
      } else {
        console.log("[v0] No roles data returned")
      }
    }

    fetchRoles()
  }, [])

  useEffect(() => {
    console.log("[v0] Current roles in state:", roles)
  }, [roles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    console.log("[v0] Signup form submitted with data:", { email: formData.email, firstName: formData.firstName, lastName: formData.lastName, company: formData.company, role: formData.role })

    try {
      console.log("[v0] Sending signup request to API...")
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      console.log("[v0] Signup API response status:", response.status)

      const data = await response.json()
      console.log("[v0] Signup API response data:", data)

      if (response.ok) {
        console.log("[v0] Signup successful!")
        setMessage({ type: "success", text: "User created successfully! You can now log in." })
        setFormData({ ...formData, password: "", firstName: "", lastName: "", company: "", role: "" })
      } else {
        console.log("[v0] Signup failed with error:", data.error)
        setMessage({ type: "error", text: data.error || "Failed to create user" })
      }
    } catch (error) {
      console.log("[v0] Signup error caught:", error)
      setMessage({ type: "error", text: "An error occurred. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a Horizon account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  console.log("[v0] Role selected:", value)
                  setFormData({ ...formData, role: value })
                }}
                required
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading roles...
                    </SelectItem>
                  ) : (
                    roles.map((role) => {
                      console.log("[v0] Rendering role option:", role)
                      return (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
