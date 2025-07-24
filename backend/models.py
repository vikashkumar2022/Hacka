from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import json

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and authorization."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    wallet_address = db.Column(db.String(42), unique=True, nullable=True, index=True)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    files = db.relationship('FileRecord', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    verifications = db.relationship('VerificationLog', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'wallet_address': self.wallet_address,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class FileRecord(db.Model):
    """File record model for tracking uploaded files."""
    __tablename__ = 'file_records'
    
    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    file_size = db.Column(db.BigInteger, nullable=False)
    file_type = db.Column(db.String(100), nullable=True)
    ipfs_hash = db.Column(db.String(100), nullable=True)
    
    # Blockchain information
    transaction_hash = db.Column(db.String(66), nullable=True, index=True)
    block_number = db.Column(db.BigInteger, nullable=True)
    gas_used = db.Column(db.BigInteger, nullable=True)
    wallet_address = db.Column(db.String(42), nullable=False, index=True)
    
    # File metadata
    upload_status = db.Column(db.String(20), default='pending')  # pending, uploaded, verified, failed
    file_metadata = db.Column(db.Text, nullable=True)  # JSON string for additional metadata
    
    # Relationships
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_at = db.Column(db.DateTime, nullable=True)
    
    # Indexes
    __table_args__ = (
        db.Index('idx_file_hash_status', 'file_hash', 'upload_status'),
        db.Index('idx_wallet_created', 'wallet_address', 'created_at'),
    )
    
    def set_metadata(self, metadata_dict):
        """Set metadata as JSON string."""
        self.file_metadata = json.dumps(metadata_dict) if metadata_dict else None
    
    def get_metadata(self):
        """Get metadata as dictionary."""
        return json.loads(self.file_metadata) if self.file_metadata else {}
    
    def to_dict(self):
        """Convert file record to dictionary."""
        return {
            'id': self.id,
            'file_name': self.file_name,
            'file_hash': self.file_hash,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'ipfs_hash': self.ipfs_hash,
            'transaction_hash': self.transaction_hash,
            'block_number': self.block_number,
            'gas_used': self.gas_used,
            'wallet_address': self.wallet_address,
            'upload_status': self.upload_status,
            'metadata': self.get_metadata(),
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class VerificationLog(db.Model):
    """Verification log model for tracking file verifications."""
    __tablename__ = 'verification_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    file_hash = db.Column(db.String(64), nullable=False, index=True)
    verification_result = db.Column(db.Boolean, nullable=False)
    verifier_address = db.Column(db.String(42), nullable=True)
    verification_method = db.Column(db.String(20), nullable=False)  # hash, file, api
    
    # Verification details
    original_file_name = db.Column(db.String(255), nullable=True)
    blockchain_data = db.Column(db.Text, nullable=True)  # JSON string of blockchain response
    error_message = db.Column(db.Text, nullable=True)
    
    # Relationships
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    file_record_id = db.Column(db.Integer, db.ForeignKey('file_records.id'), nullable=True)
    
    # Timestamps
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        db.Index('idx_hash_verified', 'file_hash', 'verified_at'),
        db.Index('idx_verifier_result', 'verifier_address', 'verification_result'),
    )
    
    def set_blockchain_data(self, data_dict):
        """Set blockchain data as JSON string."""
        self.blockchain_data = json.dumps(data_dict) if data_dict else None
    
    def get_blockchain_data(self):
        """Get blockchain data as dictionary."""
        return json.loads(self.blockchain_data) if self.blockchain_data else {}
    
    def to_dict(self):
        """Convert verification log to dictionary."""
        return {
            'id': self.id,
            'file_hash': self.file_hash,
            'verification_result': self.verification_result,
            'verifier_address': self.verifier_address,
            'verification_method': self.verification_method,
            'original_file_name': self.original_file_name,
            'blockchain_data': self.get_blockchain_data(),
            'error_message': self.error_message,
            'user_id': self.user_id,
            'file_record_id': self.file_record_id,
            'verified_at': self.verified_at.isoformat()
        }

class SystemStats(db.Model):
    """System statistics model for analytics."""
    __tablename__ = 'system_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    stat_name = db.Column(db.String(50), nullable=False, unique=True)
    stat_value = db.Column(db.BigInteger, default=0)
    stat_data = db.Column(db.Text, nullable=True)  # JSON string for complex data
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_data(self, data_dict):
        """Set stat data as JSON string."""
        self.stat_data = json.dumps(data_dict) if data_dict else None
    
    def get_data(self):
        """Get stat data as dictionary."""
        return json.loads(self.stat_data) if self.stat_data else {}
    
    def to_dict(self):
        """Convert system stats to dictionary."""
        return {
            'id': self.id,
            'stat_name': self.stat_name,
            'stat_value': self.stat_value,
            'stat_data': self.get_data(),
            'last_updated': self.last_updated.isoformat()
        }

class AuditLog(db.Model):
    """Audit log model for tracking system activities."""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(50), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(100), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    details = db.Column(db.Text, nullable=True)  # JSON string for additional details
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        db.Index('idx_action_timestamp', 'action', 'timestamp'),
        db.Index('idx_user_timestamp', 'user_id', 'timestamp'),
        db.Index('idx_resource_timestamp', 'resource_type', 'resource_id', 'timestamp'),
    )
    
    def set_details(self, details_dict):
        """Set details as JSON string."""
        self.details = json.dumps(details_dict) if details_dict else None
    
    def get_details(self):
        """Get details as dictionary."""
        return json.loads(self.details) if self.details else {}
    
    def to_dict(self):
        """Convert audit log to dictionary."""
        return {
            'id': self.id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.get_details(),
            'timestamp': self.timestamp.isoformat()
        }
