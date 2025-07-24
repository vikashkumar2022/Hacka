from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, FileRecord, User, VerificationLog, AuditLog
import os
import hashlib
import ipfshttpclient
from datetime import datetime
import mimetypes

files_bp = Blueprint('files', __name__)

def allowed_file(filename):
    """Check if file type is allowed."""
    ALLOWED_EXTENSIONS = {
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'csv', 'json', 
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'md'
    }
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_file_hash(file_data):
    """Calculate SHA-256 hash of file data."""
    return hashlib.sha256(file_data).hexdigest()

def upload_to_ipfs(file_data, filename):
    """Upload file to IPFS and return hash."""
    try:
        # Connect to IPFS
        client = ipfshttpclient.connect(
            host=current_app.config['IPFS_API_HOST'],
            port=current_app.config['IPFS_API_PORT']
        )
        
        # Upload file
        result = client.add_bytes(file_data)
        return result
        
    except Exception as e:
        print(f"IPFS upload error: {e}")
        raise Exception(f"Failed to upload to IPFS: {str(e)}")

def log_audit(action, user_id=None, resource_id=None, details=None):
    """Log audit trail."""
    try:
        audit_log = AuditLog(
            action=action,
            resource_type='file',
            resource_id=resource_id,
            user_id=user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        if details:
            audit_log.set_details(details)
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        print(f"Audit log error: {e}")

@files_bp.route('/upload-ipfs', methods=['POST'])
@jwt_required()
def upload_file_to_ipfs():
    """Upload file to IPFS only (for blockchain upload process)."""
    try:
        current_user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Read file data
        file_data = file.read()
        file_size = len(file_data)
        
        # Check file size
        if file_size > current_app.config['MAX_CONTENT_LENGTH']:
            return jsonify({'error': 'File too large'}), 413
        
        # Upload to IPFS
        ipfs_hash = upload_to_ipfs(file_data, file.filename)
        
        # Calculate file hash
        file_hash = calculate_file_hash(file_data)
        
        return jsonify({
            'message': 'File uploaded to IPFS successfully',
            'ipfsHash': ipfs_hash,
            'fileHash': file_hash,
            'fileSize': file_size,
            'fileName': file.filename
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'IPFS upload failed', 'details': str(e)}), 500

@files_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file_metadata():
    """Save file metadata after blockchain upload."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['fileName', 'fileHash', 'fileSize', 'transactionHash']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if file hash already exists
        existing_file = FileRecord.query.filter_by(file_hash=data['fileHash']).first()
        if existing_file:
            return jsonify({'error': 'File with this hash already exists'}), 409
        
        # Determine file type
        file_type = mimetypes.guess_type(data['fileName'])[0] or 'application/octet-stream'
        
        # Create file record
        file_record = FileRecord(
            file_name=data['fileName'],
            file_hash=data['fileHash'],
            file_size=data['fileSize'],
            file_type=file_type,
            ipfs_hash=data.get('ipfsHash'),
            transaction_hash=data['transactionHash'],
            block_number=data.get('blockNumber'),
            gas_used=data.get('gasUsed'),
            wallet_address=data['walletAddress'],
            upload_status='uploaded',
            user_id=current_user_id,
            uploaded_at=datetime.utcnow()
        )
        
        # Set metadata
        metadata = {
            'upload_method': 'blockchain',
            'client_ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        }
        file_record.set_metadata(metadata)
        
        db.session.add(file_record)
        db.session.commit()
        
        # Log upload
        log_audit('file_uploaded', current_user_id, str(file_record.id), {
            'file_name': data['fileName'],
            'file_hash': data['fileHash'],
            'transaction_hash': data['transactionHash']
        })
        
        return jsonify({
            'message': 'File metadata saved successfully',
            'file': file_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save file metadata', 'details': str(e)}), 500

@files_bp.route('/verify/<file_hash>', methods=['GET'])
def verify_file_by_hash(file_hash):
    """Verify file by hash."""
    try:
        # Remove '0x' prefix if present
        clean_hash = file_hash[2:] if file_hash.startswith('0x') else file_hash
        
        # Find file record
        file_record = FileRecord.query.filter_by(file_hash=clean_hash).first()
        
        verification_result = {
            'exists': bool(file_record),
            'file_hash': clean_hash,
            'verification_time': datetime.utcnow().isoformat()
        }
        
        if file_record:
            verification_result.update({
                'file_name': file_record.file_name,
                'file_size': file_record.file_size,
                'upload_time': file_record.uploaded_at.isoformat() if file_record.uploaded_at else None,
                'uploader_address': file_record.wallet_address,
                'transaction_hash': file_record.transaction_hash,
                'block_number': file_record.block_number,
                'ipfs_hash': file_record.ipfs_hash
            })
        
        # Log verification
        verification_log = VerificationLog(
            file_hash=clean_hash,
            verification_result=bool(file_record),
            verification_method='api',
            user_id=get_jwt_identity() if request.headers.get('Authorization') else None,
            file_record_id=file_record.id if file_record else None
        )
        verification_log.set_blockchain_data(verification_result)
        
        db.session.add(verification_log)
        db.session.commit()
        
        return jsonify(verification_result), 200
        
    except Exception as e:
        return jsonify({'error': 'Verification failed', 'details': str(e)}), 500

@files_bp.route('/my-files', methods=['GET'])
@jwt_required()
def get_user_files():
    """Get files uploaded by current user."""
    try:
        current_user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = FileRecord.query.filter_by(user_id=current_user_id)
        
        if status:
            query = query.filter_by(upload_status=status)
        
        files = query.order_by(FileRecord.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'files': [file.to_dict() for file in files.items],
            'total': files.total,
            'pages': files.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get user files', 'details': str(e)}), 500

@files_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_file_stats():
    """Get file statistics for current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user file counts
        total_files = FileRecord.query.filter_by(user_id=current_user_id).count()
        uploaded_files = FileRecord.query.filter_by(
            user_id=current_user_id, 
            upload_status='uploaded'
        ).count()
        
        # Get total file size
        total_size_result = db.session.query(
            db.func.sum(FileRecord.file_size)
        ).filter_by(user_id=current_user_id).scalar()
        total_size = total_size_result or 0
        
        # Get recent files
        recent_files = FileRecord.query.filter_by(
            user_id=current_user_id
        ).order_by(FileRecord.created_at.desc()).limit(5).all()
        
        # Get verification count
        verified_count = VerificationLog.query.filter_by(
            user_id=current_user_id,
            verification_result=True
        ).count()
        
        # Format recent activity
        recent_activity = []
        for file in recent_files:
            recent_activity.append({
                'fileName': file.file_name,
                'type': 'upload',
                'status': 'Success' if file.upload_status == 'uploaded' else 'Failed',
                'timestamp': file.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({
            'userFiles': total_files,
            'verifiedFiles': verified_count,
            'totalSize': total_size,
            'recentActivity': recent_activity
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get file stats', 'details': str(e)}), 500

@files_bp.route('/search', methods=['GET'])
@jwt_required()
def search_files():
    """Search files by various criteria."""
    try:
        current_user_id = get_jwt_identity()
        
        query_param = request.args.get('q', '').strip()
        file_type = request.args.get('type')
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = FileRecord.query.filter_by(user_id=current_user_id)
        
        if query_param:
            query = query.filter(
                db.or_(
                    FileRecord.file_name.ilike(f'%{query_param}%'),
                    FileRecord.file_hash.ilike(f'%{query_param}%')
                )
            )
        
        if file_type:
            query = query.filter(FileRecord.file_type.ilike(f'%{file_type}%'))
        
        if status:
            query = query.filter_by(upload_status=status)
        
        files = query.order_by(FileRecord.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'files': [file.to_dict() for file in files.items],
            'total': files.total,
            'pages': files.pages,
            'current_page': page,
            'per_page': per_page,
            'query': query_param
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Search failed', 'details': str(e)}), 500

@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required()
def get_file_details(file_id):
    """Get detailed information about a specific file."""
    try:
        current_user_id = get_jwt_identity()
        
        file_record = FileRecord.query.filter_by(
            id=file_id,
            user_id=current_user_id
        ).first()
        
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        # Get verification logs for this file
        verifications = VerificationLog.query.filter_by(
            file_record_id=file_id
        ).order_by(VerificationLog.verified_at.desc()).limit(10).all()
        
        return jsonify({
            'file': file_record.to_dict(),
            'verifications': [v.to_dict() for v in verifications]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get file details', 'details': str(e)}), 500

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file_record(file_id):
    """Delete file record (metadata only, not from blockchain)."""
    try:
        current_user_id = get_jwt_identity()
        
        file_record = FileRecord.query.filter_by(
            id=file_id,
            user_id=current_user_id
        ).first()
        
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        # Log deletion
        log_audit('file_deleted', current_user_id, str(file_id), {
            'file_name': file_record.file_name,
            'file_hash': file_record.file_hash
        })
        
        db.session.delete(file_record)
        db.session.commit()
        
        return jsonify({
            'message': 'File record deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete file record', 'details': str(e)}), 500
