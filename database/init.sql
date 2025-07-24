# Database initialization script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE file_status AS ENUM ('uploaded', 'verified', 'failed', 'deleted');
CREATE TYPE verification_result AS ENUM ('valid', 'invalid', 'pending', 'error');
CREATE TYPE audit_action AS ENUM ('upload', 'verify', 'download', 'delete', 'login', 'logout', 'register');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- File records table
CREATE TABLE IF NOT EXISTS file_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100),
    ipfs_hash VARCHAR(100),
    blockchain_tx_hash VARCHAR(66),
    contract_address VARCHAR(42),
    status file_status DEFAULT 'uploaded',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_user_file_hash UNIQUE(user_id, file_hash)
);

-- Verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_record_id UUID NOT NULL REFERENCES file_records(id) ON DELETE CASCADE,
    verifier_address VARCHAR(42),
    result verification_result NOT NULL,
    blockchain_tx_hash VARCHAR(66),
    verification_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System statistics table
CREATE TABLE IF NOT EXISTS system_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    metadata JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_metric_time UNIQUE(metric_name, recorded_at)
);

-- API keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_user_key_name UNIQUE(user_id, key_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_file_records_user_id ON file_records(user_id);
CREATE INDEX IF NOT EXISTS idx_file_records_file_hash ON file_records(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_records_ipfs_hash ON file_records(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_file_records_status ON file_records(status);
CREATE INDEX IF NOT EXISTS idx_file_records_created_at ON file_records(created_at);
CREATE INDEX IF NOT EXISTS idx_file_records_blockchain_tx ON file_records(blockchain_tx_hash);

CREATE INDEX IF NOT EXISTS idx_verification_logs_file_id ON verification_logs(file_record_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_result ON verification_logs(result);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON verification_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_system_stats_metric_name ON system_stats(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_stats_recorded_at ON system_stats(recorded_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_records_updated_at BEFORE UPDATE ON file_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for generating file statistics
CREATE OR REPLACE FUNCTION generate_file_stats()
RETURNS TABLE(
    total_files BIGINT,
    total_size BIGINT,
    verified_files BIGINT,
    pending_files BIGINT,
    failed_files BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_files,
        COALESCE(SUM(file_size), 0)::BIGINT as total_size,
        COUNT(CASE WHEN status = 'verified' THEN 1 END)::BIGINT as verified_files,
        COUNT(CASE WHEN status = 'uploaded' THEN 1 END)::BIGINT as pending_files,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT as failed_files
    FROM file_records;
END;
$$ LANGUAGE plpgsql;

-- Create function for user activity statistics
CREATE OR REPLACE FUNCTION get_user_activity_stats(user_uuid UUID)
RETURNS TABLE(
    total_uploads BIGINT,
    total_verifications BIGINT,
    total_size BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(fr.id)::BIGINT as total_uploads,
        COUNT(vl.id)::BIGINT as total_verifications,
        COALESCE(SUM(fr.file_size), 0)::BIGINT as total_size,
        MAX(GREATEST(fr.created_at, COALESCE(vl.created_at, fr.created_at))) as last_activity
    FROM file_records fr
    LEFT JOIN verification_logs vl ON fr.id = vl.file_record_id
    WHERE fr.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert default system statistics
INSERT INTO system_stats (metric_name, metric_value, metric_unit, metadata) VALUES
    ('system_version', 1.0, 'version', '{"version": "1.0.0", "build": "initial"}'),
    ('max_file_size', 104857600, 'bytes', '{"description": "Maximum allowed file size in bytes"}'),
    ('supported_file_types', 50, 'count', '{"description": "Number of supported file types"}')
ON CONFLICT (metric_name, recorded_at) DO NOTHING;

-- Create a view for file statistics
CREATE OR REPLACE VIEW file_stats_view AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as files_uploaded,
    SUM(file_size) as total_size,
    COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_files,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_files
FROM file_records
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create a view for user activity
CREATE OR REPLACE VIEW user_activity_view AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(fr.id) as total_files,
    SUM(fr.file_size) as total_size,
    MAX(fr.created_at) as last_upload,
    COUNT(al.id) as total_actions
FROM users u
LEFT JOIN file_records fr ON u.id = fr.user_id
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.username, u.email
ORDER BY total_files DESC;

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO blockchain_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO blockchain_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO blockchain_app_user;
