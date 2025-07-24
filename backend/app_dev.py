# Simple Flask app for development without Docker dependencies
import os
import hashlib
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import sqlite3
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['JWT_EXPIRATION_DELTA'] = timedelta(hours=24)

# Enable CORS for development
CORS(app, 
     origins=['http://localhost:3000'],
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Create uploads directory
UPLOAD_DIR = Path('uploads')
UPLOAD_DIR.mkdir(exist_ok=True)

# Simple SQLite database for development
DB_PATH = 'development.db'

def init_db():
    """Initialize SQLite database for development"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Files table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            ipfs_hash TEXT,
            blockchain_tx TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def create_test_user():
    """Create a test user for development"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if test user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', ('test@test.com',))
        if cursor.fetchone():
            print("Test user already exists")
        else:
            # Create test user
            password_hash = generate_password_hash('test123')
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', ('testuser', 'test@test.com', password_hash))
            print("✅ Test user created: email=test@test.com, password=test123")
        
        # Check if your user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', ('kumarviki695@gmail.com',))
        if cursor.fetchone():
            print("User kumarviki695@gmail.com already exists")
        else:
            # Create your user account
            password_hash = generate_password_hash('123456789')
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', ('kumarviki695', 'kumarviki695@gmail.com', password_hash))
            print("✅ User created: email=kumarviki695@gmail.com, password=123456789")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Error creating users: {e}")

def generate_jwt_token(user_id):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + app.config['JWT_EXPIRATION_DELTA']
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_jwt_token(token):
    """Verify JWT token and return user_id"""
    try:
        print(f"Verifying token: {token[:20]}...")
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        print(f"Token valid, user_id: {payload['user_id']}")
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token error: {e}")
        return None

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'mode': 'development'
    })

@app.route('/favicon.ico')
def favicon():
    """Handle favicon requests to prevent 404s"""
    return '', 204

@app.route('/api/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, password_hash)
            )
            user_id = cursor.lastrowid
            conn.commit()
            
            # Generate token
            token = generate_jwt_token(user_id)
            
            return jsonify({
                'message': 'User registered successfully',
                'access_token': token,
                'user': {
                    'id': user_id,
                    'username': username,
                    'email': email
                }
            }), 201
            
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username or email already exists'}), 409
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        print(f"Login attempt for email: {email}")
        
        if not all([email, password]):
            print("Missing email or password")
            return jsonify({'error': 'Missing email or password'}), 400
        
        # Check user credentials
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, username, email, password_hash FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            print(f"User not found for email: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
            
        if not check_password_hash(user[3], password):
            print(f"Invalid password for email: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = generate_jwt_token(user[0])
        print(f"Login successful for user: {user[1]} (ID: {user[0]})")
        
        return jsonify({
            'message': 'Login successful',
            'access_token': token,
            'token': token,  # Add this for compatibility
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    """Get user profile (protected endpoint)"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = verify_jwt_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get user info
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, username, email FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current user info (alias for profile)"""
    return get_profile()

@app.route('/api/files/upload-ipfs', methods=['POST'])
def upload_file_to_ipfs():
    """IPFS upload endpoint (simulated for development)"""
    try:
        print("IPFS upload request received")
        # Get token from header
        auth_header = request.headers.get('Authorization')
        print(f"Authorization header: {auth_header}")
        if not auth_header or not auth_header.startswith('Bearer '):
            print("Missing or invalid authorization header")
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = verify_jwt_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # For development, simulate IPFS upload by generating a mock hash
        import time
        import random
        import string
        
        # Generate a mock IPFS hash (46 characters starting with Qm)
        random_suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=44))
        mock_ipfs_hash = f"Qm{random_suffix}"
        
        # Simulate upload delay
        time.sleep(0.5)
        
        return jsonify({
            'success': True,
            'ipfsHash': mock_ipfs_hash,
            'message': 'File uploaded to IPFS successfully (simulated)'
        }), 200
        
    except Exception as e:
        print(f"IPFS upload error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    """File upload endpoint (simplified for development)"""
    try:
        print(f"Upload request received - Content-Type: {request.content_type}")
        print(f"Is JSON: {request.is_json}")
        print(f"Files in request: {list(request.files.keys())}")
        if request.is_json:
            print(f"JSON data: {request.get_json()}")
        
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = verify_jwt_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Check if this is a JSON request (metadata save) or file upload
        if request.is_json:
            # Handle metadata save after blockchain upload
            data = request.get_json()
            
            required_fields = ['fileName', 'fileHash', 'fileSize']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Save metadata to database
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO files (user_id, filename, file_hash, file_size, ipfs_hash, blockchain_tx)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id, 
                data['fileName'], 
                data['fileHash'], 
                data['fileSize'],
                data.get('ipfsHash'),
                data.get('transactionHash')
            ))
            
            file_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return jsonify({
                'message': 'File metadata saved successfully',
                'file': {
                    'id': file_id,
                    'filename': data['fileName'],
                    'file_hash': data['fileHash'],
                    'file_size': data['fileSize'],
                    'ipfs_hash': data.get('ipfsHash'),
                    'blockchain_tx': data.get('transactionHash')
                }
            })
        
        # Original file upload logic for actual file uploads
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file temporarily
        filename = file.filename
        file_path = UPLOAD_DIR / filename
        file.save(file_path)
        
        # Calculate file hash
        file_hash = calculate_file_hash(file_path)
        file_size = file_path.stat().st_size
        
        # Mock IPFS hash (for development)
        ipfs_hash = f"Qm{file_hash[:40]}"
        
        # Mock blockchain transaction (for development)
        blockchain_tx = f"0x{file_hash[:64]}"
        
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO files (user_id, filename, file_hash, file_size, ipfs_hash, blockchain_tx)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, filename, file_hash, file_size, ipfs_hash, blockchain_tx))
        
        file_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file': {
                'id': file_id,
                'filename': filename,
                'file_hash': file_hash,
                'file_size': file_size,
                'ipfs_hash': ipfs_hash,
                'blockchain_tx': blockchain_tx
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/verify', methods=['POST'])
def verify_file():
    """File verification endpoint"""
    try:
        data = request.get_json()
        file_hash = data.get('file_hash')
        
        if not file_hash:
            return jsonify({'error': 'Missing file_hash'}), 400
        
        # Check if file exists in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM files WHERE file_hash = ?', (file_hash,))
        file_record = cursor.fetchone()
        conn.close()
        
        if file_record:
            return jsonify({
                'verification_result': 'valid',
                'message': 'File verified successfully',
                'file_info': {
                    'filename': file_record[2],
                    'file_hash': file_record[3],
                    'ipfs_hash': file_record[5],
                    'blockchain_tx': file_record[6],
                    'upload_date': file_record[7]
                }
            })
        else:
            return jsonify({
                'verification_result': 'invalid',
                'message': 'File not found in blockchain registry'
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List user files endpoint"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = verify_jwt_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get user files
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
        files = cursor.fetchall()
        conn.close()
        
        file_list = []
        for file in files:
            file_list.append({
                'id': file[0],
                'filename': file[2],
                'file_hash': file[3],
                'file_size': file[4],
                'ipfs_hash': file[5],
                'blockchain_tx': file[6],
                'upload_date': file[7]
            })
        
        return jsonify({'files': file_list})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/stats', methods=['GET'])
def get_file_stats():
    """Get file statistics for user"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = verify_jwt_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get user's file stats
        cursor.execute('SELECT COUNT(*) FROM files WHERE user_id = ?', (user_id,))
        total_files = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(file_size) FROM files WHERE user_id = ?', (user_id,))
        total_size = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM files WHERE user_id = ? AND blockchain_tx IS NOT NULL', (user_id,))
        blockchain_files = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'totalFiles': total_files,
            'totalSize': total_size,
            'blockchainFiles': blockchain_files,
            'success': True
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get basic stats
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM files')
        total_files = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(file_size) FROM files')
        total_size = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return jsonify({
            'stats': {
                'total_users': total_users,
                'total_files': total_files,
                'total_size': total_size,
                'verified_files': total_files,  # All files are "verified" in dev mode
                'system_status': 'development'
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/overview', methods=['GET'])
def get_analytics_overview():
    """Get analytics overview data"""
    try:
        # Optional authentication - get user_id if token provided
        user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_jwt_token(token)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get basic stats
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM files')
        total_files = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(file_size) FROM files WHERE file_size IS NOT NULL')
        total_size = cursor.fetchone()[0] or 0
        
        # Get recent uploads (last 7 days)
        cursor.execute('''
            SELECT COUNT(*) FROM files 
            WHERE created_at >= datetime('now', '-7 days')
        ''')
        recent_uploads = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'overview': {
                'total_files': total_files,
                'total_users': total_users,
                'total_size': total_size,
                'recent_uploads': recent_uploads,
                'verified_files': total_files,
                'blockchain_transactions': total_files
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/trends', methods=['GET'])
def get_analytics_trends():
    """Get analytics trends data"""
    try:
        # Optional authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_jwt_token(token)
            
        time_range = request.args.get('range', '7d')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get daily upload counts for the past week
        cursor.execute('''
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM files 
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        ''')
        daily_uploads = cursor.fetchall()
        
        # Format data for charts
        trends_data = []
        for date, count in daily_uploads:
            trends_data.append({
                'date': date,
                'uploads': count,
                'verifications': count,
                'downloads': count * 2  # Simulated data
            })
        
        conn.close()
        
        return jsonify({
            'trends': trends_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/blockchain-stats', methods=['GET'])
def get_blockchain_stats():
    """Get blockchain statistics"""
    try:
        # Optional authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_jwt_token(token)
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM files')
        total_files = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'blockchain': {
                'total_transactions': total_files,
                'verified_files': total_files,
                'network_status': 'active',
                'last_block_time': '2024-01-01T00:00:00Z',
                'gas_price': '20 gwei',
                'block_height': 12345 + total_files
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/audit-logs', methods=['GET'])
def get_audit_logs():
    """Get audit trail logs"""
    try:
        # Optional authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_jwt_token(token)
            
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        action_filter = request.args.get('action', '')
        user_filter = request.args.get('user', '')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Build query with filters
        query = '''
            SELECT f.filename, f.created_at, u.email, f.file_hash, f.blockchain_tx
            FROM files f
            JOIN users u ON f.user_id = u.id
            WHERE 1=1
        '''
        params = []
        
        if user_filter:
            query += ' AND u.email LIKE ?'
            params.append(f'%{user_filter}%')
            
        query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, (page - 1) * limit])
        
        cursor.execute(query, params)
        logs = cursor.fetchall()
        
        # Format audit logs
        audit_logs = []
        for log in logs:
            audit_logs.append({
                'id': len(audit_logs) + 1,
                'timestamp': log[1],
                'action': 'file_upload',
                'user': log[2],
                'resource': log[0],
                'details': f'File uploaded with hash {log[3][:16]}...',
                'blockchain_hash': log[4],
                'status': 'success'
            })
        
        # Get total count for pagination
        cursor.execute('SELECT COUNT(*) FROM files')
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'logs': audit_logs,
            'pagination': {
                'current_page': page,
                'total_pages': (total + limit - 1) // limit,
                'total_items': total
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/audit-stats', methods=['GET'])
def get_audit_stats():
    """Get audit statistics"""
    try:
        # Optional authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_jwt_token(token)
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get counts by action type
        cursor.execute('SELECT COUNT(*) FROM files')
        total_actions = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM files 
            WHERE created_at >= datetime('now', '-24 hours')
        ''')
        recent_actions = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'stats': {
                'total_actions': total_actions,
                'recent_actions': recent_actions,
                'action_types': {
                    'file_upload': total_actions,
                    'verification': total_actions,
                    'download': 0,
                    'admin_action': 0
                },
                'success_rate': 100.0
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    create_test_user()
    
    print("🔧 Starting Blockchain File Security System - Development Mode")
    print("📱 Frontend: Start with 'cd frontend && npm start'")
    print("🔗 Backend API: http://localhost:5000")
    print("💾 Database: SQLite (development.db)")
    print("⚠️  Note: This is a simplified version for development without Docker")
    print("")
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
