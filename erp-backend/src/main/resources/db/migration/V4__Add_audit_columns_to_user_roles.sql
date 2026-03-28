ALTER TABLE user_roles ADD COLUMN last_modified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_roles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing active rows with current timestamp
UPDATE user_roles SET last_modified_at = NOW() WHERE last_modified_at IS NULL;
