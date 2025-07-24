-- Initialize database schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE audit_action AS ENUM (
    'login_success', 'login_failed', 'logout',
    'file_uploaded', 'file_verified', 'file_deleted',
    'user_created', 'user_updated', 'user_deleted',
    'settings_updated'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON file_records(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON file_records(created_at);
CREATE INDEX IF NOT EXISTS idx_files_file_hash ON file_records(file_hash);
CREATE INDEX IF NOT EXISTS idx_verification_logs_file_id ON verification_logs(file_record_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
