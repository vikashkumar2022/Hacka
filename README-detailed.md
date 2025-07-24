# Blockchain File Security System

A comprehensive blockchain-based file upload and verification system that ensures data integrity, authenticity, and non-repudiation using smart contracts and distributed storage.

## 🚀 Features

### Core Features
- **Secure File Upload**: Files are hashed using SHA-256 and stored on IPFS
- **Blockchain Verification**: Smart contracts provide immutable proof of file integrity
- **User Authentication**: JWT-based authentication with secure password hashing
- **Real-time Dashboard**: Monitor file uploads, verifications, and system metrics
- **Audit Trail**: Complete logging of all user actions and system events
- **File Verification**: Verify file integrity against blockchain records

### Security Features
- **Data Integrity**: SHA-256 hashing ensures file tampering detection
- **Non-repudiation**: Blockchain provides immutable proof of file ownership
- **Access Control**: Role-based permissions and user isolation
- **Secure Storage**: IPFS distributed storage with content addressing
- **Audit Logging**: Comprehensive tracking of all system activities

### Technical Features
- **Microservices Architecture**: Containerized services with Docker
- **Real-time Monitoring**: Prometheus metrics and Grafana dashboards
- **Scalable Database**: PostgreSQL with optimized indexing
- **Load Balancing**: Nginx reverse proxy with rate limiting
- **Health Checks**: Automated service health monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React)       │◄──►│   (Flask)       │◄──►│   (Hardhat)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         │              │   Database      │              │
         │              └─────────────────┘              │
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│      IPFS       │◄─────────────┘
                        │   Storage       │
                        └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern UI framework with hooks
- **Material-UI**: Professional component library
- **Web3.js**: Ethereum blockchain integration
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **Flask-JWT-Extended**: JWT authentication
- **IPFS HTTP Client**: Distributed storage integration
- **Web3.py**: Ethereum smart contract interaction

### Blockchain
- **Solidity**: Smart contract programming language
- **Hardhat**: Ethereum development environment
- **OpenZeppelin**: Security-focused contract library
- **Ethers.js**: Ethereum library for frontend

### Infrastructure
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Docker**: Containerization
- **Nginx**: Reverse proxy and load balancer
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## 📋 Prerequisites

- **Docker Desktop**: Version 4.0 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18 or higher (for development)
- **Python**: Version 3.11 or higher (for development)
- **Git**: For version control

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **Network**: Internet connection for downloading dependencies

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd blockchain-file-security
```

### 2. Environment Setup
Copy the environment files and configure as needed:
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment  
cp frontend/.env.example frontend/.env

# Blockchain environment
cp blockchain/.env.example blockchain/.env
```

### 3. Deploy with Docker (Recommended)

#### For Windows (PowerShell):
```powershell
.\deploy-windows.ps1
```

#### For Linux/macOS:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Manual Deployment
If you prefer to deploy manually:

```bash
# Stop any existing containers
docker-compose down

# Build and start all services
docker-compose up -d --build

# Deploy smart contracts
docker-compose exec hardhat npx hardhat run scripts/deploy.js --network localhost

# Initialize database
docker-compose exec backend python -c "
from app import app, db
with app.app_context():
    db.create_all()
"
```

### 5. Access the Application
- **Main Application**: http://localhost
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 📚 Usage Guide

### Creating an Account
1. Navigate to http://localhost:3000
2. Click "Sign Up" to create a new account
3. Fill in your username, email, and password
4. Confirm your email address (if email verification is enabled)

### Uploading Files
1. Log in to your account
2. Navigate to the "Upload" page
3. Drag and drop files or click to select
4. Add optional metadata and description
5. Click "Upload" to process the files
6. Wait for IPFS upload and blockchain confirmation

### Verifying Files
1. Go to the "Verify" page
2. Upload the file you want to verify
3. The system will calculate the file hash
4. Compare against blockchain records
5. View verification results and details

### Monitoring
1. Access the Dashboard for system overview
2. View file statistics and recent activity
3. Check Grafana dashboards for detailed metrics
4. Monitor system health and performance

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/blockchain_files

# Blockchain
WEB3_PROVIDER_URI=http://localhost:8545
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b8D404d77443Ebe1d5

# IPFS
IPFS_API_HOST=localhost
IPFS_API_PORT=5001

# Security
JWT_SECRET_KEY=your-secret-key-here
BCRYPT_LOG_ROUNDS=12

# File Upload
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_EXTENSIONS=pdf,doc,docx,txt,jpg,png,gif,mp4,avi

# Redis
REDIS_URL=redis://localhost:6379/0
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b8D404d77443Ebe1d5
REACT_APP_WEB3_PROVIDER_URI=http://localhost:8545
REACT_APP_IPFS_GATEWAY=http://localhost:8080/ipfs
```

#### Blockchain (.env)
```env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NETWORK_URL=http://localhost:8545
ETHERSCAN_API_KEY=your-etherscan-api-key
```

## 🧪 Development

### Running Individual Services

#### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run --debug
```

#### Frontend Development
```bash
cd frontend
npm install
npm start
```

#### Blockchain Development
```bash
cd blockchain
npm install
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
cd frontend
npm test

# Smart contract tests
cd blockchain
npx hardhat test
```

### Code Quality
```bash
# Python code formatting
cd backend
black .
flake8 .

# JavaScript code formatting
cd frontend
npm run lint
npm run format
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### File Management Endpoints
- `POST /api/files/upload` - Upload new file
- `GET /api/files` - List user files
- `GET /api/files/{id}` - Get file details
- `POST /api/files/verify` - Verify file integrity
- `DELETE /api/files/{id}` - Delete file

### Analytics Endpoints
- `GET /api/analytics/stats` - System statistics
- `GET /api/analytics/user-activity` - User activity data
- `GET /api/analytics/file-trends` - File upload trends

### Blockchain Endpoints
- `GET /api/blockchain/status` - Blockchain connection status
- `GET /api/blockchain/contract-info` - Smart contract information
- `POST /api/blockchain/verify-transaction` - Verify transaction

## 🔐 Security Considerations

### File Security
- Files are hashed using SHA-256 before upload
- IPFS provides content-addressed storage
- Smart contracts ensure immutable records
- Access control prevents unauthorized access

### Authentication Security
- Passwords are hashed using bcrypt
- JWT tokens have configurable expiration
- Session management with secure cookies
- Rate limiting to prevent abuse

### Infrastructure Security
- Docker containers provide isolation
- Nginx implements security headers
- Database connections are encrypted
- API endpoints have input validation

### Blockchain Security
- Smart contracts use OpenZeppelin libraries
- Access control modifiers protect functions
- Events provide audit trail
- Gas optimization prevents DoS attacks

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Docker daemon not running
sudo systemctl start docker

# Port conflicts
docker-compose down
lsof -i :3000  # Check what's using the port

# Permission issues
sudo chown -R $USER:$USER .
```

#### Service Issues
```bash
# Check service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs hardhat

# Restart specific service
docker-compose restart backend

# Rebuild specific service
docker-compose up -d --build backend
```

#### Database Issues
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d blockchain_files

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Blockchain Issues
```bash
# Check Hardhat node
curl http://localhost:8545

# Redeploy contracts
docker-compose exec hardhat npx hardhat run scripts/deploy.js --network localhost

# Check contract deployment
docker-compose exec hardhat npx hardhat console --network localhost
```

### Getting Help
1. Check the logs for error messages
2. Verify all services are running: `docker-compose ps`
3. Test individual endpoints with curl or Postman
4. Check the GitHub issues for known problems
5. Join our Discord community for support

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test` and `pytest`
5. Commit your changes: `git commit -m "Add your feature"`
6. Push to the branch: `git push origin feature/your-feature`
7. Create a Pull Request

### Code Standards
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages

### Testing Guidelines
- Write unit tests for all new functions
- Include integration tests for API endpoints
- Test smart contracts with edge cases
- Verify UI components with React Testing Library

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin** for security-focused smart contract libraries
- **IPFS** for distributed storage infrastructure
- **Ethereum** for blockchain platform
- **Material-UI** for React components
- **Flask** community for web framework
- **Docker** for containerization technology

## 📞 Support

For support and questions:
- 📧 Email: support@blockchain-file-security.com
- 💬 Discord: [Join our community](https://discord.gg/blockchain-file-security)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Wiki: [Documentation](https://github.com/your-repo/wiki)

---

**Made with ❤️ for the blockchain community**
