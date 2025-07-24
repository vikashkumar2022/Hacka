# Simple Development Setup Script
Write-Host "Blockchain File Security System - Development Setup" -ForegroundColor Green
Write-Host "This will help you run the system without Docker" -ForegroundColor Yellow
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "[+] Node.js is installed: $nodeVersion" -ForegroundColor Green
    $nodeInstalled = $true
}
catch {
    Write-Host "[X] Node.js is not installed" -ForegroundColor Red
    $nodeInstalled = $false
}

# Check if Python is installed
try {
    $pythonVersion = python --version 2>$null
    Write-Host "[+] Python is installed: $pythonVersion" -ForegroundColor Green
    $pythonInstalled = $true
}
catch {
    Write-Host "[X] Python is not installed" -ForegroundColor Red
    $pythonInstalled = $false
}

Write-Host ""

if (-not $nodeInstalled) {
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Download the LTS version (v18 or higher)" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $pythonInstalled) {
    Write-Host "Please install Python from: https://www.python.org/" -ForegroundColor Yellow
    Write-Host "Download Python 3.11 or higher" -ForegroundColor Yellow
    Write-Host ""
}

if (-not ($nodeInstalled -and $pythonInstalled)) {
    Write-Host "Please install the missing prerequisites and run this script again." -ForegroundColor Red
    Write-Host "After installation, restart PowerShell and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "All prerequisites are installed! Starting setup..." -ForegroundColor Green
Write-Host ""

# Ask user what they want to do
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. Setup and start Frontend only (React)" -ForegroundColor White
Write-Host "2. Setup and start Backend only (Flask)" -ForegroundColor White
Write-Host "3. Show manual setup instructions" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Setting up Frontend..." -ForegroundColor Green
        
        if (Test-Path "frontend") {
            Set-Location "frontend"
            
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Starting development server..." -ForegroundColor Green
                Write-Host "Frontend will open at http://localhost:3000" -ForegroundColor Cyan
                Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
                npm start
            } else {
                Write-Host "Failed to install dependencies" -ForegroundColor Red
            }
        } else {
            Write-Host "Frontend directory not found!" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Setting up Backend..." -ForegroundColor Green
        
        if (Test-Path "backend") {
            Set-Location "backend"
            
            Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
            pip install -r requirements_dev.txt
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Starting Flask development server..." -ForegroundColor Green
                Write-Host "Backend API will run at http://localhost:5000" -ForegroundColor Cyan
                Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
                python app_dev.py
            } else {
                Write-Host "Failed to install dependencies" -ForegroundColor Red
            }
        } else {
            Write-Host "Backend directory not found!" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Manual Setup Instructions:" -ForegroundColor Green
        Write-Host ""
        Write-Host "Open separate PowerShell windows for each component:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Frontend (Window 1):" -ForegroundColor Cyan
        Write-Host "  cd frontend" -ForegroundColor White
        Write-Host "  npm install" -ForegroundColor White
        Write-Host "  npm start" -ForegroundColor White
        Write-Host ""
        Write-Host "Backend (Window 2):" -ForegroundColor Cyan
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  pip install -r requirements_dev.txt" -ForegroundColor White
        Write-Host "  python app_dev.py" -ForegroundColor White
        Write-Host ""
        Write-Host "Then access:" -ForegroundColor Yellow
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
        Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Green
    }
    
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    }
}
