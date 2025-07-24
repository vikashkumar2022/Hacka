#!/bin/bash

# Blockchain File Security System - Deployment Script
# This script handles the complete deployment of the application

set -e

echo "🚀 Starting Blockchain File Security System Deployment..."

# Configuration
APP_NAME="blockchain-file-security"
NETWORK_NAME="blockchain_network"
COMPOSE_FILE="docker-compose.yml"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=("uploads" "logs" "ssl" "data/postgres" "data/redis" "data/ipfs")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    print_success "Directories created successfully"
}

# Generate SSL certificates for development
generate_ssl_certs() {
    print_status "Generating SSL certificates for development..."
    
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist"
    fi
}

# Set up environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ "$1" = "production" ]; then
            cp .env.production .env
            print_warning "Using production environment. Please update the .env file with your actual values!"
        else
            cp .env.development .env
            print_success "Using development environment"
        fi
    else
        print_warning "Environment file already exists"
    fi
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Stop any existing containers
    docker-compose down --remove-orphans
    
    # Build and start services
    if [ "$1" = "development" ]; then
        print_status "Starting development environment with Ganache..."
        docker-compose --profile development up -d --build
    else
        print_status "Starting production environment..."
        docker-compose up -d --build
    fi
    
    print_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec -T db pg_isready -U postgres; do
        sleep 2
    done
    
    # Wait for application
    print_status "Waiting for application to start..."
    sleep 10
    
    # Check if app is responding
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
            print_success "Application is ready!"
            break
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Application failed to start within expected time"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    docker-compose exec -T app python -c "
from app import create_app
from models import db
app = create_app()
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
    
    print_success "Database migrations completed"
}

# Deploy smart contract (development only)
deploy_contract() {
    if [ "$1" = "development" ]; then
        print_status "Deploying smart contract to local Ganache..."
        
        # Change to contracts directory and deploy
        cd contracts
        npx hardhat compile
        npx hardhat run scripts/deploy.js --network localhost
        cd ..
        
        print_success "Smart contract deployed"
    else
        print_warning "Skipping contract deployment in production mode"
        print_warning "Please deploy your contract manually to the target network"
    fi
}

# Show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    print_status "Application URLs:"
    echo "  🌐 Frontend: http://localhost"
    echo "  🔗 API: http://localhost/api"
    echo "  📊 IPFS Gateway: http://localhost:8080"
    
    if [ "$1" = "development" ]; then
        echo "  ⛓️  Ganache RPC: http://localhost:8545"
    fi
    
    echo ""
    print_status "Useful Commands:"
    echo "  📋 View logs: docker-compose logs -f"
    echo "  🔄 Restart: docker-compose restart"
    echo "  🛑 Stop: docker-compose down"
    echo "  🧹 Clean up: docker-compose down -v --remove-orphans"
}

# Main deployment function
main() {
    local environment=${1:-development}
    
    echo "🚀 Deploying Blockchain File Security System"
    echo "Environment: $environment"
    echo "----------------------------------------"
    
    check_docker
    create_directories
    generate_ssl_certs
    setup_environment $environment
    start_services $environment
    wait_for_services
    run_migrations
    deploy_contract $environment
    show_status $environment
}

# Parse command line arguments
case "$1" in
    "production")
        main production
        ;;
    "development"|"dev"|"")
        main development
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "clean")
        print_status "Cleaning up all containers and volumes..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        echo "Usage: $0 {development|production|stop|clean|logs|status}"
        echo ""
        echo "Commands:"
        echo "  development - Deploy in development mode (default)"
        echo "  production  - Deploy in production mode"
        echo "  stop        - Stop all services"
        echo "  clean       - Remove all containers and volumes"
        echo "  logs        - Show service logs"
        echo "  status      - Show service status"
        exit 1
        ;;
esac
