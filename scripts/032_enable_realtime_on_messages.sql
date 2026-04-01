-- Enable realtime on messages table
-- This allows the messages table to broadcast changes to subscribed clients

-- Enable realtime on the messages table
alter publication supabase_realtime add table messages;

-- Ensure the table has replica identity set (required for realtime)
alter table messages replica identity full;
