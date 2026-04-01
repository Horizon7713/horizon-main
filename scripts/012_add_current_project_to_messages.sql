-- Add current_project column to messages table
-- This stores the ID of the active project associated with the message

ALTER TABLE public.messages
ADD COLUMN current_project UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_messages_current_project ON public.messages(current_project);

-- Add comment
COMMENT ON COLUMN public.messages.current_project IS 'The active project associated with this message';
