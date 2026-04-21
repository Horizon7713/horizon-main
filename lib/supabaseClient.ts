import { GoTrueClient, createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Full Supabase client for auth + database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optional dedicated auth client if you still need it elsewhere
export const authClient = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    apikey: supabaseAnonKey,
  },
});
