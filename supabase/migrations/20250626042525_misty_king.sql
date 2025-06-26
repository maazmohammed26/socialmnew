/*
  # Fix Notifications Table

  1. Create notifications table
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles)
    - `type` (text, notification type)
    - `content` (text, notification message)
    - `reference_id` (uuid, optional reference to related entity)
    - `read` (boolean, read status, default false)
    - `deleted_at` (timestamp, soft delete)
    - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on notifications table
    - Add policies for users to manage their own notifications

  3. Indexes
    - Add indexes for better performance
*/

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop existing policies if they exist
  DECLARE
    policy_record RECORD;
  BEGIN
    FOR policy_record IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'notifications' AND schemaname = 'public'
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.notifications';
    END LOOP;
  END;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON public.notifications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

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

-- Insert sample notifications for testing (only if no notifications exist)
DO $$
DECLARE
  sample_user_id uuid;
  notification_count integer;
BEGIN
  -- Check if notifications already exist
  SELECT COUNT(*) INTO notification_count FROM public.notifications;
  
  -- Only insert sample notifications if none exist
  IF notification_count = 0 THEN
    -- Get a sample user ID (first user in profiles table)
    SELECT id INTO sample_user_id FROM public.profiles LIMIT 1;
    
    -- Only insert if we have a user
    IF sample_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, content, read) VALUES
      (sample_user_id, 'system', '🎨 Don''t like the pixel font? No problem! Visit your Profile section to change themes and customize fonts & colors to your preference.', false),
      (sample_user_id, 'like', 'Welcome to SocialChat! Someone liked your post', false),
      (sample_user_id, 'comment', 'Someone commented on your post', false),
      (sample_user_id, 'friend_request', 'You have a new friend request', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if no users exist yet
    NULL;
END $$;