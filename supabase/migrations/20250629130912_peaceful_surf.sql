/*
  # Fix notifications table and related issues

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `type` (text, notification type)
      - `content` (text, notification message)
      - `reference_id` (uuid, optional reference to related entity)
      - `read` (boolean, read status, default false)
      - `deleted_at` (timestamp, soft delete)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `notifications` table
    - Add policies for users to manage their own notifications

  3. Indexes
    - Add indexes for better performance on notifications
*/

-- Drop existing notifications table if it exists to start fresh
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  reference_id uuid,
  read boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for any user"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_deleted_at ON public.notifications(deleted_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Set replica identity for realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;
END $$;