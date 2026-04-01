import { GoTrueClient } from '@supabase/supabase-js'

// Singleton GoTrueClient instance
// Prevents "Multiple GoTrueClient instances detected" warnings
export const authClient = new GoTrueClient({
  url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
  headers: {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
})
