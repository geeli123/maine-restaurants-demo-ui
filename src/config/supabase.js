// Import Supabase from CDN (available as window.supabase)
const { createClient } = window.supabase

// Configuration - Replace these with your actual values or load from a config file
const supabaseUrl = window.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = window.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error(
    'Missing Supabase environment variables. Please set window.VITE_SUPABASE_URL and window.VITE_SUPABASE_ANON_KEY in a config file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
