-- supabase/migrations/20260522000002_add_mp_preference_id.sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_mp_preference_id ON pedidos(mp_preference_id);
