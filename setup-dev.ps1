# Development Setup Script - Run Without Docker
# This script helps you run the system in development mode without Docker

Write-Host "🔧 Blockchain File Security System - Development Setup" -ForegroundColor Green
Write-Host "This will help you run the system without Docker for development/testing" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
function Test-Prerequisite {
    param($Command, $Name)
    try {
        & $Command --version 2>$null | Out-Null
        Write-Host "✅ $Name is installed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $Name is not installed" -ForegroundColor Red
        return $false
    }
}

Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
$nodeInstalled = Test-Prerequisite "node" "Node.js"

# Check Python
$pythonInstalled = Test-Prerequisite "python" "Python"

# Check npm
$npmInstalled = Test-Prerequisite "npm" "npm"

Write-Host ""

if (-not $nodeInstalled) {
    Write-Host "📥 Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   Download the LTS version (v18 or higher)" -ForegroundColor Yellow
}

if (-not $pythonInstalled) {
    Write-Host "📥 Please install Python from: https://www.python.org/" -ForegroundColor Yellow
    Write-Host "   Download Python 3.11 or higher" -ForegroundColor Yellow
}

if (-not ($nodeInstalled -and $pythonInstalled)) {
    Write-Host ""
    Write-Host "⚠️ Please install the missing prerequisites and run this script again." -ForegroundColor Red
    Write-Host "   After installation, restart PowerShell and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 All prerequisites are installed! Setting up development environment..." -ForegroundColor Green
Write-Host ""

# Setup instructions
Write-Host "📋 Development Setup Instructions:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Frontend Setup (React):" -ForegroundColor Yellow
Write-Host "   cd frontend"
Write-Host "   npm install"
Write-Host "   npm start"
Write-Host "   → Will run on http://localhost:3000"
Write-Host ""

Write-Host "2️⃣ Backend Setup (Flask):" -ForegroundColor Yellow
Write-Host "   cd backend"
Write-Host "   python -m venv venv"
Write-Host "   venv\Scripts\activate"
Write-Host "   pip install -r requirements.txt"
Write-Host "   python app.py"
Write-Host "   → Will run on http://localhost:5000"
Write-Host ""

Write-Host "3️⃣ Blockchain Setup (Hardhat):" -ForegroundColor Yellow
Write-Host "   cd blockchain"
Write-Host "   npm install"
Write-Host "   npx hardhat node"
Write-Host "   → Will run on http://localhost:8545"
Write-Host ""

Write-Host "🎯 Quick Start Commands:" -ForegroundColor Green
Write-Host ""

$choice = Read-Host "Would you like me to start setting up the frontend automatically? (y/n)"

if ($choice -eq 'y' -or $choice -eq 'Y') {
    Write-Host ""
    Write-Host "🔨 Setting up frontend..." -ForegroundColor Green
    
    # Navigate to frontend directory
    if (Test-Path "frontend") {
        Set-Location "frontend"
        
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend dependencies installed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🚀 Starting frontend development server..." -ForegroundColor Green
            Write-Host "   The frontend will open in your browser at http://localhost:3000" -ForegroundColor Cyan
            Write-Host "   Press Ctrl+C to stop the server when done" -ForegroundColor Yellow
            Write-Host ""
            
            # Start the development server
            npm start
        } else {
            Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
            Write-Host "   Please check the error messages above" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Frontend directory not found!" -ForegroundColor Red
        Write-Host "   Make sure you're in the project root directory" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "📝 Manual Setup:" -ForegroundColor Green
    Write-Host "   Open 3 separate PowerShell windows and run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Window 1 (Frontend):" -ForegroundColor Cyan
    Write-Host "     cd frontend && npm install && npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "   Window 2 (Backend):" -ForegroundColor Cyan
    Write-Host "     cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python app.py" -ForegroundColor White
    Write-Host ""
    Write-Host "   Window 3 (Blockchain):" -ForegroundColor Cyan
    Write-Host "     cd blockchain && npm install && npx hardhat node" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Note: For full functionality, you'll also need PostgreSQL and Redis running locally" -ForegroundColor Yellow
    Write-Host "   Or you can modify the backend to use SQLite for development testing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 For Docker setup later:" -ForegroundColor Cyan
Write-Host "   1. Install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor White
Write-Host "   2. Start Docker Desktop" -ForegroundColor White
Write-Host "   3. Run: .\deploy-simple.ps1" -ForegroundColor White
