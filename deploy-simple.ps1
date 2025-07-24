# Simple deployment script for Windows PowerShell
param(
    [switch]$Clean,
    [switch]$NoBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Blockchain File Security System Deployment Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\deploy-simple.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Clean     Clean up existing containers and volumes"
    Write-Host "  -NoBuild   Skip building images (use existing)"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    exit 0
}

function Write-Status {
    param($Message, $Color = 'White')
    Write-Host $Message -ForegroundColor $Color
}

function Test-DockerRunning {
    try {
        docker info | Out-Null 2>&1
        return $true
    }
    catch {
        return $false
    }
}

function Test-CommandExists {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Main deployment
Write-Status "[+] Starting Blockchain File Security System Deployment..." Green

# Check prerequisites
if (-not (Test-DockerRunning)) {
    Write-Status "[X] Docker is not running. Please start Docker Desktop and try again." Red
    exit 1
}

if (-not (Test-CommandExists "docker-compose")) {
    Write-Status "[X] Docker Compose is not installed. Please install Docker Compose and try again." Red
    exit 1
}

Write-Status "[+] Docker is running" Green

# Clean up if requested
if ($Clean) {
    Write-Status "[-] Cleaning up existing containers and volumes..." Yellow
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    Write-Status "[+] Cleanup completed" Green
}

# Stop existing containers
Write-Status "[-] Stopping existing containers..." Yellow
docker-compose down --remove-orphans

# Build and start services
if ($NoBuild) {
    Write-Status "[+] Starting services without building..." Yellow
    docker-compose up -d
} else {
    Write-Status "[+] Building and starting services..." Yellow
    docker-compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Status "[X] Failed to start services" Red
    exit 1
}

Write-Status "[+] Services started successfully" Green

# Wait for services to be healthy
Write-Status "[~] Waiting for services to be healthy..." Yellow
$timeout = 300  # 5 minutes
$elapsed = 0
$interval = 10

while ($elapsed -lt $timeout) {
    $status = docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
    if ($status -match "unhealthy|starting") {
        Write-Status "[~] Services still starting... ($elapsed/$timeout seconds)" Yellow
        Start-Sleep $interval
        $elapsed += $interval
    } else {
        break
    }
}

# Show service status
Write-Status "[i] Current service status:" Cyan
docker-compose ps

# Test service endpoints
Write-Status "[~] Testing service endpoints..." Yellow

# Test backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Status "[+] Backend API is responding" Green
    }
}
catch {
    Write-Status "[X] Backend API is not responding" Red
}

# Test frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Status "[+] Frontend is responding" Green
    }
}
catch {
    Write-Status "[X] Frontend is not responding" Red
}

# Test nginx
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Status "[+] Nginx proxy is responding" Green
    }
}
catch {
    Write-Status "[X] Nginx proxy is not responding" Red
}

# Deploy smart contracts
Write-Status "[~] Deploying smart contracts..." Yellow
try {
    docker-compose exec -T hardhat npx hardhat run scripts/deploy.js --network localhost
    Write-Status "[+] Smart contracts deployed" Green
}
catch {
    Write-Status "[X] Failed to deploy smart contracts" Red
}

# Initialize database
Write-Status "[~] Initializing database..." Yellow
try {
    $initScript = @"
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"@
    $initScript | docker-compose exec -T backend python
    Write-Status "[+] Database initialized" Green
}
catch {
    Write-Status "[X] Failed to initialize database" Red
}

# Final status
Write-Status "[+] Deployment completed!" Green
Write-Host ""
Write-Status "Service URLs:" Yellow
Write-Host "Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API: " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Green
Write-Host "Main Application: " -NoNewline; Write-Host "http://localhost" -ForegroundColor Green
Write-Host "Prometheus: " -NoNewline; Write-Host "http://localhost:9090" -ForegroundColor Green
Write-Host "Grafana: " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Green -NoNewline; Write-Host " (admin/admin)"
Write-Host ""
Write-Status "Management Commands:" Yellow
Write-Host "View logs: " -NoNewline; Write-Host "docker-compose logs -f [service]" -ForegroundColor Green
Write-Host "Stop services: " -NoNewline; Write-Host "docker-compose down" -ForegroundColor Green
Write-Host "Restart services: " -NoNewline; Write-Host "docker-compose restart" -ForegroundColor Green
Write-Host "View status: " -NoNewline; Write-Host "docker-compose ps" -ForegroundColor Green
Write-Host ""
Write-Status "Next Steps:" Yellow
Write-Host "1. Open http://localhost:3000 to access the application"
Write-Host "2. Create an account and start uploading files"
Write-Host "3. Monitor the system via Grafana dashboards"
Write-Host "4. Check logs if you encounter any issues"
Write-Host ""
Write-Status "Happy coding!" Green
