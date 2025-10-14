import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndnyfgiwhqrhtcjovork.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbnlmZ2l3aHFyaHRjam92b3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDUzOTYsImV4cCI6MjA3NTcyMTM5Nn0.rdnqQVemlKkNVPafO76Oz-1zfd8VSdr5PFfD3Mj9MsQ'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)