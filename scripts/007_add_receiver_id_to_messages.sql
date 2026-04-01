-- Add receiver_id column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Create index for better query performance on receiver_id
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

-- Create composite index for common queries (sender + receiver)
CREATE INDEX IF NOT EXISTS idx_messages_user_receiver ON public.messages(user_id, receiver_id);
