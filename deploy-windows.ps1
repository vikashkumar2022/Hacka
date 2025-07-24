# Blockchain File Security System Deployment Script for Windows
param(
    [switch]$Clean,
    [switch]$NoBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Blockchain File Security System Deployment Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Clean     Clean up existing containers and volumes"
    Write-Host "  -NoBuild   Skip building images (use existing)"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    exit 0
}

# Colors for output
$Colors = @{
    Red = 'Red'
    Green = 'Green'
    Yellow = 'Yellow'
    Cyan = 'Cyan'
}

function Write-Status {
    param($Message, $Color = 'White')
    Write-Host $Message -ForegroundColor $Color
}

function Test-DockerRunning {
    try {
        docker info | Out-Null
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

# Main deployment function
function Start-Deployment {
    Write-Status "[+] Starting Blockchain File Security System Deployment..." $Colors.Green
    
    # Check prerequisites
    if (-not (Test-DockerRunning)) {
        Write-Status "[X] Docker is not running. Please start Docker Desktop and try again." $Colors.Red
        exit 1
    }
    
    if (-not (Test-CommandExists "docker-compose")) {
        Write-Status "[X] Docker Compose is not installed. Please install Docker Compose and try again." $Colors.Red
        exit 1
    }
    
    Write-Status "[+] Docker is running" $Colors.Green
    
    # Clean up if requested
    if ($Clean) {
        Write-Status "🧹 Cleaning up existing containers and volumes..." $Colors.Yellow
        docker-compose down --volumes --remove-orphans
        docker system prune -f
        Write-Status "✅ Cleanup completed" $Colors.Green
    }
    
    # Stop existing containers
    Write-Status "🛑 Stopping existing containers..." $Colors.Yellow
    docker-compose down --remove-orphans
    
    # Build and start services
    if ($NoBuild) {
        Write-Status "🚀 Starting services without building..." $Colors.Yellow
        docker-compose up -d
    } else {
        Write-Status "🏗️ Building and starting services..." $Colors.Yellow
        docker-compose up -d --build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to start services" $Colors.Red
        exit 1
    }
    
    Write-Status "✅ Services started successfully" $Colors.Green
    
    # Wait for services to be healthy
    Write-Status "⏳ Waiting for services to be healthy..." $Colors.Yellow
    $timeout = 300  # 5 minutes
    $elapsed = 0
    $interval = 10
    
    while ($elapsed -lt $timeout) {
        $status = docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
        if ($status -match "unhealthy|starting") {
            Write-Status "⏳ Services still starting... ($elapsed/$timeout seconds)" $Colors.Yellow
            Start-Sleep $interval
            $elapsed += $interval
        } else {
            break
        }
    }
    
    # Show service status
    Write-Status "🔍 Current service status:" $Colors.Cyan
    docker-compose ps
    
    # Test service endpoints
    Write-Status "🧪 Testing service endpoints..." $Colors.Yellow
    
    # Test backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Status "✅ Backend API is responding" $Colors.Green
        }
    }
    catch {
        Write-Status "❌ Backend API is not responding" $Colors.Red
    }
    
    # Test frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Status "✅ Frontend is responding" $Colors.Green
        }
    }
    catch {
        Write-Status "❌ Frontend is not responding" $Colors.Red
    }
    
    # Test nginx
    try {
        $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Status "✅ Nginx proxy is responding" $Colors.Green
        }
    }
    catch {
        Write-Status "❌ Nginx proxy is not responding" $Colors.Red
    }
    
    # Deploy smart contracts
    Write-Status "📜 Deploying smart contracts..." $Colors.Yellow
    try {
        docker-compose exec -T hardhat npx hardhat run scripts/deploy.js --network localhost
        Write-Status "✅ Smart contracts deployed" $Colors.Green
    }
    catch {
        Write-Status "❌ Failed to deploy smart contracts" $Colors.Red
    }
    
    # Initialize database
    Write-Status "🗃️ Initializing database..." $Colors.Yellow
    try {
        $initScript = @"
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"@
        $initScript | docker-compose exec -T backend python
        Write-Status "✅ Database initialized" $Colors.Green
    }
    catch {
        Write-Status "❌ Failed to initialize database" $Colors.Red
    }
    
    # Final status
    Write-Status "🎉 Deployment completed!" $Colors.Green
    Write-Host ""
    Write-Status "📊 Service URLs:" $Colors.Yellow
    Write-Host "Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Green
    Write-Host "Backend API: " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Green
    Write-Host "Main Application: " -NoNewline; Write-Host "http://localhost" -ForegroundColor Green
    Write-Host "Prometheus: " -NoNewline; Write-Host "http://localhost:9090" -ForegroundColor Green
    Write-Host "Grafana: " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Green -NoNewline; Write-Host " (admin/admin)"
    Write-Host ""
    Write-Status "🔧 Management Commands:" $Colors.Yellow
    Write-Host "View logs: " -NoNewline; Write-Host "docker-compose logs -f [service]" -ForegroundColor Green
    Write-Host "Stop services: " -NoNewline; Write-Host "docker-compose down" -ForegroundColor Green
    Write-Host "Restart services: " -NoNewline; Write-Host "docker-compose restart" -ForegroundColor Green
    Write-Host "View status: " -NoNewline; Write-Host "docker-compose ps" -ForegroundColor Green
    Write-Host ""
    Write-Status "📚 Next Steps:" $Colors.Yellow
    Write-Host "1. Open http://localhost:3000 to access the application"
    Write-Host "2. Create an account and start uploading files"
    Write-Host "3. Monitor the system via Grafana dashboards"
    Write-Host "4. Check logs if you encounter any issues"
    Write-Host ""
    Write-Status "Happy coding!" $Colors.Green
}

# Run the deployment
Start-Deployment
