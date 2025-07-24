from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, FileRecord, VerificationLog, User, AuditLog, SystemStats
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_overview():
    """Get system overview statistics."""
    try:
        current_user_id = get_jwt_identity()
        
        # Total files count
        total_files = FileRecord.query.count()
        
        # Total verifications count
        total_verifications = VerificationLog.query.count()
        
        # Total users count
        total_users = User.query.filter_by(is_active=True).count()
        
        # Total storage used
        total_size_result = db.session.query(func.sum(FileRecord.file_size)).scalar()
        total_size = total_size_result or 0
        
        # Success rate
        successful_verifications = VerificationLog.query.filter_by(verification_result=True).count()
        success_rate = (successful_verifications / total_verifications * 100) if total_verifications > 0 else 0
        
        # Recent growth (last 30 days vs previous 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        recent_files = FileRecord.query.filter(FileRecord.created_at >= thirty_days_ago).count()
        previous_files = FileRecord.query.filter(
            and_(FileRecord.created_at >= sixty_days_ago, FileRecord.created_at < thirty_days_ago)
        ).count()
        
        growth_rate = ((recent_files - previous_files) / previous_files * 100) if previous_files > 0 else 0
        
        return jsonify({
            'totalFiles': total_files,
            'totalVerifications': total_verifications,
            'totalUsers': total_users,
            'totalSize': total_size,
            'successRate': round(success_rate, 2),
            'growthRate': round(growth_rate, 2),
            'recentFiles': recent_files
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_trends():
    """Get trend data for charts."""
    try:
        time_range = request.args.get('range', '7d')
        
        # Parse time range
        if time_range == '24h':
            days = 1
            group_by = 'hour'
        elif time_range == '7d':
            days = 7
            group_by = 'day'
        elif time_range == '30d':
            days = 30
            group_by = 'day'
        elif time_range == '90d':
            days = 90
            group_by = 'week'
        else:
            days = 7
            group_by = 'day'
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Upload trend
        if group_by == 'hour':
            upload_trend = db.session.query(
                func.date_trunc('hour', FileRecord.created_at).label('date'),
                func.count(FileRecord.id).label('uploads')
            ).filter(
                FileRecord.created_at >= start_date
            ).group_by(
                func.date_trunc('hour', FileRecord.created_at)
            ).order_by('date').all()
        else:
            upload_trend = db.session.query(
                func.date_trunc('day', FileRecord.created_at).label('date'),
                func.count(FileRecord.id).label('uploads')
            ).filter(
                FileRecord.created_at >= start_date
            ).group_by(
                func.date_trunc('day', FileRecord.created_at)
            ).order_by('date').all()
        
        # Verification trend
        verification_trend = db.session.query(
            func.date_trunc('day', VerificationLog.verified_at).label('date'),
            func.count(VerificationLog.id).label('verifications'),
            func.sum(func.cast(VerificationLog.verification_result, db.Integer)).label('successful')
        ).filter(
            VerificationLog.verified_at >= start_date
        ).group_by(
            func.date_trunc('day', VerificationLog.verified_at)
        ).order_by('date').all()
        
        # File types distribution
        file_types = db.session.query(
            FileRecord.file_type,
            func.count(FileRecord.id).label('count')
        ).filter(
            FileRecord.created_at >= start_date
        ).group_by(
            FileRecord.file_type
        ).order_by(desc('count')).limit(10).all()
        
        # User activity by hour (for heatmap)
        user_activity = db.session.query(
            func.extract('hour', FileRecord.created_at).label('hour'),
            func.count(FileRecord.id).label('activity')
        ).filter(
            FileRecord.created_at >= start_date
        ).group_by(
            func.extract('hour', FileRecord.created_at)
        ).order_by('hour').all()
        
        return jsonify({
            'uploadTrend': [
                {
                    'date': trend.date.isoformat(),
                    'uploads': trend.uploads
                } for trend in upload_trend
            ],
            'verificationTrend': [
                {
                    'date': trend.date.isoformat(),
                    'verifications': trend.verifications,
                    'successful': trend.successful or 0
                } for trend in verification_trend
            ],
            'fileTypes': [
                {
                    'name': ft.file_type or 'Unknown',
                    'count': ft.count
                } for ft in file_types
            ],
            'userActivity': [
                {
                    'hour': int(activity.hour),
                    'activity': activity.activity
                } for activity in user_activity
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/blockchain-stats', methods=['GET'])
@jwt_required()
def get_blockchain_stats():
    """Get blockchain-related statistics."""
    try:
        # Get gas usage statistics
        gas_stats = db.session.query(
            func.sum(FileRecord.gas_used).label('total_gas'),
            func.avg(FileRecord.gas_used).label('avg_gas'),
            func.count(FileRecord.transaction_hash).label('total_transactions')
        ).filter(
            FileRecord.transaction_hash.isnot(None)
        ).first()
        
        # Get block distribution
        block_stats = db.session.query(
            func.count(func.distinct(FileRecord.block_number)).label('unique_blocks'),
            func.min(FileRecord.block_number).label('first_block'),
            func.max(FileRecord.block_number).label('latest_block')
        ).filter(
            FileRecord.block_number.isnot(None)
        ).first()
        
        # Calculate average block time (simplified)
        if block_stats.first_block and block_stats.latest_block and block_stats.unique_blocks:
            # This is a rough estimate - in reality you'd query the blockchain
            avg_block_time = 15  # Ethereum average block time
        else:
            avg_block_time = 0
        
        return jsonify({
            'gasUsed': int(gas_stats.total_gas or 0),
            'avgGasPerTransaction': int(gas_stats.avg_gas or 0),
            'totalTransactions': int(gas_stats.total_transactions or 0),
            'avgBlockTime': avg_block_time,
            'uniqueBlocks': int(block_stats.unique_blocks or 0),
            'blockRange': {
                'first': int(block_stats.first_block or 0),
                'latest': int(block_stats.latest_block or 0)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/user-stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get user-specific statistics."""
    try:
        current_user_id = get_jwt_identity()
        
        # User's file statistics
        user_files = FileRecord.query.filter_by(user_id=current_user_id).count()
        user_verifications = VerificationLog.query.filter_by(user_id=current_user_id).count()
        
        # User's storage usage
        user_storage = db.session.query(
            func.sum(FileRecord.file_size)
        ).filter_by(user_id=current_user_id).scalar() or 0
        
        # User's recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_uploads = FileRecord.query.filter(
            and_(
                FileRecord.user_id == current_user_id,
                FileRecord.created_at >= thirty_days_ago
            )
        ).count()
        
        # User's file types
        user_file_types = db.session.query(
            FileRecord.file_type,
            func.count(FileRecord.id).label('count')
        ).filter_by(
            user_id=current_user_id
        ).group_by(
            FileRecord.file_type
        ).order_by(desc('count')).all()
        
        return jsonify({
            'totalFiles': user_files,
            'totalVerifications': user_verifications,
            'storageUsed': user_storage,
            'recentUploads': recent_uploads,
            'fileTypes': [
                {
                    'type': ft.file_type or 'Unknown',
                    'count': ft.count
                } for ft in user_file_types
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/security-metrics', methods=['GET'])
@jwt_required()
def get_security_metrics():
    """Get security-related metrics."""
    try:
        # Verification success rate
        total_verifications = VerificationLog.query.count()
        successful_verifications = VerificationLog.query.filter_by(
            verification_result=True
        ).count()
        success_rate = (successful_verifications / total_verifications * 100) if total_verifications > 0 else 0
        
        # Failed verification attempts (potential tamper attempts)
        failed_verifications = VerificationLog.query.filter_by(
            verification_result=False
        ).count()
        
        # Login security metrics
        successful_logins = AuditLog.query.filter_by(action='login_success').count()
        failed_logins = AuditLog.query.filter_by(action='login_failed').count()
        
        # File integrity metrics
        total_files_checked = VerificationLog.query.filter(
            VerificationLog.file_record_id.isnot(None)
        ).count()
        
        return jsonify({
            'verificationSuccessRate': round(success_rate, 2),
            'totalVerifications': total_verifications,
            'failedVerifications': failed_verifications,
            'successfulLogins': successful_logins,
            'failedLogins': failed_logins,
            'filesIntegrityChecked': total_files_checked
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs with filtering."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        action = request.args.get('action')
        resource_type = request.args.get('resourceType')
        date_from = request.args.get('dateFrom')
        date_to = request.args.get('dateTo')
        search = request.args.get('search')
        
        query = AuditLog.query
        
        # Filter by user if not admin
        if not user.is_admin:
            query = query.filter_by(user_id=current_user_id)
        
        # Apply filters
        if action:
            query = query.filter_by(action=action)
        
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        
        if date_from:
            query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        
        if date_to:
            query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to))
        
        if search:
            query = query.filter(
                or_(
                    AuditLog.action.ilike(f'%{search}%'),
                    AuditLog.resource_id.ilike(f'%{search}%'),
                    AuditLog.details.ilike(f'%{search}%')
                )
            )
        
        # Paginate results
        logs = query.order_by(desc(AuditLog.timestamp)).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'pages': logs.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/audit-stats', methods=['GET'])
@jwt_required()
def get_audit_stats():
    """Get audit statistics summary."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        query = AuditLog.query
        if not user.is_admin:
            query = query.filter_by(user_id=current_user_id)
        
        total_logs = query.count()
        
        # Count by action type
        uploads = query.filter_by(action='file_uploaded').count()
        verifications = query.filter_by(action='file_verified').count()
        logins = query.filter(
            AuditLog.action.in_(['login_success', 'login_failed'])
        ).count()
        
        return jsonify({
            'totalLogs': total_logs,
            'uploads': uploads,
            'verifications': verifications,
            'logins': logins
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/export', methods=['POST'])
@jwt_required()
def export_analytics():
    """Export analytics data."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        export_type = data.get('type', 'csv')  # csv, json
        date_range = data.get('dateRange', '30d')
        include_data = data.get('include', ['files', 'verifications', 'audit'])
        
        # This would generate and return export data
        # For now, return a placeholder
        
        export_data = {
            'export_id': f'export_{current_user_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}',
            'type': export_type,
            'date_range': date_range,
            'generated_at': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        
        return jsonify({
            'message': 'Export initiated',
            'export': export_data
        }), 202
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
