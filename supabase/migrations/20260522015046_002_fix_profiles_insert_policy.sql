/*
  # Fix profiles INSERT policy for signup trigger

  1. Problem
    - The `profiles` table had no INSERT policy, so the `handle_new_user()` 
      trigger (which runs after auth.users insert) was blocked by RLS.
    - This caused "Database error saving new user" during signup.

  2. Changes
    - Add INSERT policy on `profiles` that allows the trigger to insert new rows.
      The trigger runs as SECURITY DEFINER, so it bypasses RLS by default,
      but Supabase's auth flow requires an explicit INSERT policy for the 
      authenticated role to work correctly during signup.
    - Add policy allowing INSERT when the new row's id matches auth.uid()
*/
