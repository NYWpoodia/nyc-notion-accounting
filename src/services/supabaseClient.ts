import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dlziinforufdlcjdxdma.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsemlpbmZvcnVmZGxjamR4ZG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjAwMDgsImV4cCI6MjEwMDM5NjAwOH0.7PWscMMsL4unmbt3LZPT4N4s-hncewkeyaI4atq-NZo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
