#!/bin/bash

# Blockchain File Security System Deployment Script
set -e

echo "🚀 Starting Blockchain File Security System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Function to check if a command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans
check_status "Stopped existing containers"

# Remove unused Docker resources
echo -e "${YELLOW}🧹 Cleaning up Docker resources...${NC}"
docker system prune -f
check_status "Cleaned up Docker resources"

# Build and start all services
echo -e "${YELLOW}🏗️  Building and starting services...${NC}"
docker-compose up -d --build
check_status "Built and started services"

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
timeout=300  # 5 minutes
elapsed=0
interval=10

while [ $elapsed -lt $timeout ]; do
    if docker-compose ps | grep -q "unhealthy\|starting"; then
        echo -e "${YELLOW}⏳ Services still starting... ($elapsed/$timeout seconds)${NC}"
        sleep $interval
        elapsed=$((elapsed + interval))
    else
        break
    fi
done

# Check final status
echo -e "${YELLOW}🔍 Checking service status...${NC}"
docker-compose ps

# Test if services are responding
echo -e "${YELLOW}🧪 Testing service endpoints...${NC}"

# Test backend health
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${RED}❌ Backend API is not responding${NC}"
fi

# Test frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi

# Test nginx proxy
if curl -f http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx proxy is responding${NC}"
else
    echo -e "${RED}❌ Nginx proxy is not responding${NC}"
fi

# Deploy smart contracts
echo -e "${YELLOW}📜 Deploying smart contracts...${NC}"
docker-compose exec hardhat npx hardhat run scripts/deploy.js --network localhost
check_status "Smart contracts deployed"

# Run database migrations
echo -e "${YELLOW}🗃️  Running database migrations...${NC}"
docker-compose exec backend python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
check_status "Database migrations completed"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Service URLs:${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend API: ${GREEN}http://localhost:5000${NC}"
echo -e "Main Application: ${GREEN}http://localhost${NC}"
echo -e "Prometheus: ${GREEN}http://localhost:9090${NC}"
echo -e "Grafana: ${GREEN}http://localhost:3001${NC} (admin/admin)"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo -e "View logs: ${GREEN}docker-compose logs -f [service]${NC}"
echo -e "Stop services: ${GREEN}docker-compose down${NC}"
echo -e "Restart services: ${GREEN}docker-compose restart${NC}"
echo -e "View status: ${GREEN}docker-compose ps${NC}"
echo ""
echo -e "${YELLOW}📚 Next Steps:${NC}"
echo "1. Open http://localhost:3000 to access the application"
echo "2. Create an account and start uploading files"
echo "3. Monitor the system via Grafana dashboards"
echo "4. Check logs if you encounter any issues"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
