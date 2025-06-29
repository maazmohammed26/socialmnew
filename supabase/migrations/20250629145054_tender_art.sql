/*
  # Add favorite friends functionality

  1. New Tables
    - `favorite_friends`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `friend_id` (uuid, foreign key to profiles)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `favorite_friends` table
    - Add policies for users to manage their favorites

  3. Functions
    - Create function to get mutual friends
    - Create function to get mutual friends count
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

-- Create indexes for better performance
CREATE INDEX idx_favorite_friends_user_id ON public.favorite_friends(user_id);
CREATE INDEX idx_favorite_friends_friend_id ON public.favorite_friends(friend_id);

-- Set replica identity for realtime
ALTER TABLE public.favorite_friends REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.favorite_friends;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
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
CREATE OR REPLACE FUNCTION get_mutual_friends(
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
GRANT EXECUTE ON FUNCTION get_mutual_friends(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_friends_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_friends(uuid, integer) TO authenticated;