ALTER TABLE memories ADD COLUMN IF NOT EXISTS original_key text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS thumbnail_key text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS status text DEFAULT 'processing';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE memories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;


CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories (user_id);
CREATE INDEX IF NOT EXISTS memories_poi_id_idx ON memories (poi_id);
CREATE INDEX IF NOT EXISTS memories_trip_id_idx ON memories (trip_id);
CREATE INDEX IF NOT EXISTS memories_visibility_status_idx ON memories (visibility, status, moderation_status);
