/*
  # Add Friend Management Features

  1. New Tables
    - `favorite_friends` - Store favorite friends
    - `friend_notes` - Store private notes about friends
    - `friend_tags` - Store tag categories for friends
    - `friend_tag_assignments` - Assign tags to friends

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control

  3. Functions
    - Create functions for mutual friends
    - Add helper functions for friend management
*/

-- Create favorite_friends table
CREATE TABLE IF NOT EXISTS public.favorite_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on favorite_friends table
ALTER TABLE public.favorite_friends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for favorite_friends
CREATE POLICY "Users can manage their own favorite friends"
  ON public.favorite_friends
  USING (auth.uid() = user_id);

-- Create friend_notes table
CREATE TABLE IF NOT EXISTS public.friend_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friend_notes table
ALTER TABLE public.friend_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friend_notes
CREATE POLICY "Users can manage their own friend notes"
  ON public.friend_notes
  USING (auth.uid() = user_id);

-- Create friend_tags table
CREATE TABLE IF NOT EXISTS public.friend_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on friend_tags table
ALTER TABLE public.friend_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friend_tags
CREATE POLICY "Users can manage their own friend tags"
  ON public.friend_tags
  USING (auth.uid() = user_id);

-- Create friend_tag_assignments table
CREATE TABLE IF NOT EXISTS public.friend_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.friend_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id, tag_id)
);

-- Enable RLS on friend_tag_assignments table
ALTER TABLE public.friend_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friend_tag_assignments
CREATE POLICY "Users can manage their own friend tag assignments"
  ON public.friend_tag_assignments
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_favorite_friends_user_id ON public.favorite_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_friends_friend_id ON public.favorite_friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_notes_user_id ON public.friend_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notes_friend_id ON public.friend_notes(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_tags_user_id ON public.friend_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_tag_assignments_user_id ON public.friend_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_tag_assignments_friend_id ON public.friend_tag_assignments(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_tag_assignments_tag_id ON public.friend_tag_assignments(tag_id);

-- Set replica identity for realtime
ALTER TABLE public.favorite_friends REPLICA IDENTITY FULL;
ALTER TABLE public.friend_notes REPLICA IDENTITY FULL;
ALTER TABLE public.friend_tags REPLICA IDENTITY FULL;
ALTER TABLE public.friend_tag_assignments REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.favorite_friends;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_notes;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_tags;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_tag_assignments;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Create function to get mutual friends
CREATE OR REPLACE FUNCTION get_mutual_friends(
  user_uuid uuid,
  friend_uuid uuid,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  username text,
  avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = user_uuid THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friends
    WHERE (sender_id = user_uuid OR receiver_id = user_uuid)
    AND status = 'accepted'
  ),
  other_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = friend_uuid THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friends
    WHERE (sender_id = friend_uuid OR receiver_id = friend_uuid)
    AND status = 'accepted'
  ),
  mutual AS (
    SELECT uf.friend_id
    FROM user_friends uf
    JOIN other_friends of ON uf.friend_id = of.friend_id
  )
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar
  FROM profiles p
  JOIN mutual m ON p.id = m.friend_id
  LIMIT limit_count;
END;
$$;

-- Create function to get mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(
  user_uuid uuid,
  friend_uuid uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mutual_count integer;
BEGIN
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = user_uuid THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friends
    WHERE (sender_id = user_uuid OR receiver_id = user_uuid)
    AND status = 'accepted'
  ),
  other_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = friend_uuid THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friends
    WHERE (sender_id = friend_uuid OR receiver_id = friend_uuid)
    AND status = 'accepted'
  ),
  mutual AS (
    SELECT uf.friend_id
    FROM user_friends uf
    JOIN other_friends of ON uf.friend_id = of.friend_id
  )
  SELECT COUNT(*) INTO mutual_count FROM mutual;
  
  RETURN mutual_count;
END;
$$;

-- Create function to get users with mutual friends for suggestions
CREATE OR REPLACE FUNCTION get_mutual_friends_suggestions(
  user_uuid uuid,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  username text,
  avatar text,
  created_at timestamptz,
  mutual_friends_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = user_uuid THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friends
    WHERE (sender_id = user_uuid OR receiver_id = user_uuid)
    AND status = 'accepted'
  ),
  friend_connections AS (
    SELECT 
      CASE 
        WHEN f.sender_id = uf.friend_id THEN f.receiver_id
        ELSE f.sender_id
      END as potential_friend_id,
      uf.friend_id as mutual_friend_id
    FROM friends f
    JOIN user_friends uf ON (f.sender_id = uf.friend_id OR f.receiver_id = uf.friend_id)
    WHERE f.status = 'accepted'
    AND CASE 
          WHEN f.sender_id = uf.friend_id THEN f.receiver_id
          ELSE f.sender_id
        END != user_uuid
  ),
  potential_friends AS (
    SELECT 
      potential_friend_id,
      COUNT(DISTINCT mutual_friend_id) as mutual_count
    FROM friend_connections
    GROUP BY potential_friend_id
  ),
  excluded_users AS (
    -- Users who are already friends with the current user
    SELECT friend_id FROM user_friends
    UNION
    -- The current user
    SELECT user_uuid
    UNION
    -- Users who have pending requests with the current user
    SELECT sender_id FROM friends WHERE receiver_id = user_uuid AND status = 'pending'
    UNION
    SELECT receiver_id FROM friends WHERE sender_id = user_uuid AND status = 'pending'
  )
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar,
    p.created_at,
    pf.mutual_count as mutual_friends_count
  FROM profiles p
  JOIN potential_friends pf ON p.id = pf.potential_friend_id
  WHERE p.id NOT IN (SELECT * FROM excluded_users)
  ORDER BY pf.mutual_count DESC, p.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_mutual_friends(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_friends_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_friends_suggestions(uuid, integer) TO authenticated;

-- Insert default friend tags for all users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    -- Only insert if user doesn't already have these tags
    IF NOT EXISTS (SELECT 1 FROM friend_tags WHERE user_id = user_record.id AND name = 'Close Friends') THEN
      INSERT INTO friend_tags (user_id, name, color) VALUES
        (user_record.id, 'Close Friends', '#22c55e'),
        (user_record.id, 'Work', '#3b82f6'),
        (user_record.id, 'Family', '#ec4899'),
        (user_record.id, 'School', '#f59e0b')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;