import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for READ-ONLY operations.
 * For mutations, use Server Actions instead.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
