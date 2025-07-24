# Comprehensive PowerShell test script for Blockchain File Security System

param(
    [switch]$Verbose,
    [switch]$SkipLoad,
    [switch]$Help
)

if ($Help) {
    Write-Host "Blockchain File Security System Test Suite" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\test-system.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Verbose   Show detailed output for all tests"
    Write-Host "  -SkipLoad  Skip load testing (faster execution)"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    exit 0
}

# Test configuration
$ApiBaseUrl = "http://localhost:5000/api"
$FrontendUrl = "http://localhost:3000"
$ProxyUrl = "http://localhost"

# Test user credentials
$TestUserEmail = "test@example.com"
$TestUserPassword = "TestPassword123!"
$TestUsername = "testuser"

# Colors for output
$Colors = @{
    Red = 'Red'
    Green = 'Green'
    Yellow = 'Yellow'
    Blue = 'Cyan'
    White = 'White'
}

# Test results tracking
$TestResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Write-TestResult {
    param($Message, $Success, $Detail = "")
    
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor $Colors.Green
        $TestResults.Passed++
    } else {
        Write-Host "❌ $Message" -ForegroundColor $Colors.Red
        $TestResults.Failed++
        if ($Detail -and $Verbose) {
            Write-Host "   $Detail" -ForegroundColor $Colors.Yellow
        }
    }
}

function Write-TestSection {
    param($Section)
    Write-Host "`n$Section" -ForegroundColor $Colors.Blue
}

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$TimeoutSec = 30
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
        }
    }
    catch {
        return @{
            Success = $false
            StatusCode = $_.Exception.Response.StatusCode.value__
            Error = $_.Exception.Message
        }
    }
}

function Test-ServiceHealth {
    param($ServiceName, $Url, $ExpectedStatus = 200)
    
    $result = Invoke-ApiRequest -Url $Url -TimeoutSec 10
    $success = $result.Success -and $result.StatusCode -eq $ExpectedStatus
    
    Write-TestResult "$ServiceName health check" $success $result.Error
    return $success
}

function Test-ApiEndpoint {
    param(
        $Endpoint,
        $Method = "GET",
        $Data = $null,
        $ExpectedStatus = 200,
        $AuthHeader = $null
    )
    
    $headers = @{}
    if ($AuthHeader) {
        $headers["Authorization"] = $AuthHeader
    }
    
    $result = Invoke-ApiRequest -Method $Method -Url "$ApiBaseUrl$Endpoint" -Headers $headers -Body $Data
    $success = $result.Success -and $result.StatusCode -eq $ExpectedStatus
    
    Write-TestResult "$Method $Endpoint" $success $result.Error
    return $result
}

# Main test execution
Write-Host "🧪 Starting Comprehensive System Tests..." -ForegroundColor $Colors.Blue

# Wait for services
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor $Colors.Yellow
Start-Sleep -Seconds 10

# 1. Service Health Tests
Write-TestSection "1. Service Health Tests"
Test-ServiceHealth "Frontend" $FrontendUrl
Test-ServiceHealth "Backend API" "$ApiBaseUrl/health"
Test-ServiceHealth "Nginx Proxy" $ProxyUrl
Test-ServiceHealth "Prometheus" "http://localhost:9090/-/healthy"
Test-ServiceHealth "Grafana" "http://localhost:3001/api/health"

# 2. Database Connectivity Tests
Write-TestSection "2. Database Connectivity Tests"

# Test PostgreSQL
try {
    $pgResult = docker-compose exec -T postgres pg_isready -U postgres 2>&1
    $pgSuccess = $LASTEXITCODE -eq 0
    Write-TestResult "PostgreSQL connection" $pgSuccess
}
catch {
    Write-TestResult "PostgreSQL connection" $false $_.Exception.Message
}

# Test Redis
try {
    $redisResult = docker-compose exec -T redis redis-cli ping 2>&1
    $redisSuccess = $LASTEXITCODE -eq 0
    Write-TestResult "Redis connection" $redisSuccess
}
catch {
    Write-TestResult "Redis connection" $false $_.Exception.Message
}

# 3. IPFS Tests
Write-TestSection "3. IPFS Tests"
Test-ServiceHealth "IPFS API" "http://localhost:5001/api/v0/id"

# 4. Blockchain Tests
Write-TestSection "4. Blockchain Tests"
$blockchainData = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
$blockchainResult = Invoke-ApiRequest -Method "POST" -Url "http://localhost:8545" -Body $blockchainData
Write-TestResult "Hardhat node connectivity" $blockchainResult.Success

# 5. API Authentication Tests
Write-TestSection "5. API Authentication Tests"

# Test user registration
$registerData = @{
    username = $TestUsername
    email = $TestUserEmail
    password = $TestUserPassword
} | ConvertTo-Json

$registerResult = Test-ApiEndpoint "/auth/register" "POST" $registerData 201
$jwtToken = $null
$authHeader = $null

if ($registerResult.Success) {
    try {
        $registerResponse = $registerResult.Content | ConvertFrom-Json
        $jwtToken = $registerResponse.access_token
        $authHeader = "Bearer $jwtToken"
    }
    catch {
        Write-TestResult "Extract JWT token" $false $_.Exception.Message
    }
}

# Test user login
$loginData = @{
    email = $TestUserEmail
    password = $TestUserPassword
} | ConvertTo-Json

$loginResult = Test-ApiEndpoint "/auth/login" "POST" $loginData 200

if ($loginResult.Success) {
    try {
        $loginResponse = $loginResult.Content | ConvertFrom-Json
        $jwtToken = $loginResponse.access_token
        $authHeader = "Bearer $jwtToken"
        Write-TestResult "JWT token extraction" $true
    }
    catch {
        Write-TestResult "JWT token extraction" $false $_.Exception.Message
    }
}

# Test protected endpoint
if ($authHeader) {
    Test-ApiEndpoint "/auth/profile" "GET" $null 200 $authHeader
}

# 6. File Upload and Verification Tests
Write-TestSection "6. File Upload and Verification Tests"

if ($authHeader) {
    # Create a test file
    $testFileContent = "This is a test file for blockchain verification"
    $testFilePath = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $testFilePath -Value $testFileContent
    
    try {
        # Test file upload using curl (PowerShell's Invoke-WebRequest doesn't handle multipart well)
        $curlResult = curl -s -X POST -H "Authorization: $authHeader" -F "file=@$testFilePath" -F "metadata={`"description`":`"Test file for automated testing`"}" "$ApiBaseUrl/files/upload"
        
        if ($curlResult -and $curlResult.Contains('"file_hash"')) {
            Write-TestResult "File upload" $true
            
            # Extract file hash for verification
            $fileHashMatch = [regex]::Match($curlResult, '"file_hash":"([^"]*)"')
            if ($fileHashMatch.Success) {
                $fileHash = $fileHashMatch.Groups[1].Value
                
                # Test file verification
                $verifyData = @{ file_hash = $fileHash } | ConvertTo-Json
                $verifyResult = Test-ApiEndpoint "/files/verify" "POST" $verifyData 200 $authHeader
                
                if ($verifyResult.Success) {
                    Write-TestResult "File verification" $true
                }
            }
        } else {
            Write-TestResult "File upload" $false "Upload response invalid"
        }
    }
    catch {
        Write-TestResult "File upload" $false $_.Exception.Message
    }
    finally {
        Remove-Item -Path $testFilePath -Force -ErrorAction SilentlyContinue
    }
}

# 7. Analytics and Statistics Tests
Write-TestSection "7. Analytics and Statistics Tests"

if ($authHeader) {
    Test-ApiEndpoint "/analytics/stats" "GET" $null 200 $authHeader
    Test-ApiEndpoint "/analytics/user-activity" "GET" $null 200 $authHeader
}

# 8. Security Tests
Write-TestSection "8. Security Tests"

# Test unauthorized access
Test-ApiEndpoint "/auth/profile" "GET" $null 401

# Test invalid credentials
$invalidLoginData = @{
    email = "invalid@example.com"
    password = "wrongpassword"
} | ConvertTo-Json

$invalidResult = Test-ApiEndpoint "/auth/login" "POST" $invalidLoginData 401
Write-TestResult "Invalid login rejection" ($invalidResult.StatusCode -eq 401)

# 9. Integration Tests
Write-TestSection "9. Integration Tests"

# Test complete workflow
$workflowUser = "workflow_test@example.com"
$workflowData = @{
    username = "workflowuser"
    email = $workflowUser
    password = $TestUserPassword
} | ConvertTo-Json

$workflowRegister = Test-ApiEndpoint "/auth/register" "POST" $workflowData 201

if ($workflowRegister.Success) {
    try {
        $workflowResponse = $workflowRegister.Content | ConvertFrom-Json
        $workflowToken = $workflowResponse.access_token
        $workflowAuth = "Bearer $workflowToken"
        
        # Create and upload test file
        $workflowTestContent = "Workflow test file content"
        $workflowTestPath = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $workflowTestPath -Value $workflowTestContent
        
        $workflowUpload = curl -s -X POST -H "Authorization: $workflowAuth" -F "file=@$workflowTestPath" "$ApiBaseUrl/files/upload"
        
        if ($workflowUpload -and $workflowUpload.Contains('"file_hash"')) {
            $workflowHashMatch = [regex]::Match($workflowUpload, '"file_hash":"([^"]*)"')
            if ($workflowHashMatch.Success) {
                $workflowHash = $workflowHashMatch.Groups[1].Value
                $workflowVerifyData = @{ file_hash = $workflowHash } | ConvertTo-Json
                $workflowVerify = Test-ApiEndpoint "/files/verify" "POST" $workflowVerifyData 200 $workflowAuth
                
                Write-TestResult "Complete workflow test" $workflowVerify.Success
            }
        } else {
            Write-TestResult "Complete workflow test" $false "Workflow upload failed"
        }
        
        Remove-Item -Path $workflowTestPath -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-TestResult "Complete workflow test" $false $_.Exception.Message
    }
}

# 10. Performance Tests
Write-TestSection "10. Performance Tests"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$perfResult = Invoke-ApiRequest -Url "$ApiBaseUrl/health"
$stopwatch.Stop()

$responseTime = $stopwatch.ElapsedMilliseconds
if ($responseTime -lt 1000) {
    Write-TestResult "API response time ($responseTime ms)" $true
} else {
    Write-TestResult "API response time ($responseTime ms)" $false "Response too slow"
}

# 11. Monitoring Tests
Write-TestSection "11. Monitoring Tests"

$prometheusResult = Invoke-ApiRequest -Url "http://localhost:9090/api/v1/query?query=up"
$prometheusSuccess = $prometheusResult.Success -and $prometheusResult.Content.Contains('"status":"success"')
Write-TestResult "Prometheus metrics" $prometheusSuccess

$grafanaResult = Invoke-ApiRequest -Url "http://localhost:3001/api/health"
$grafanaSuccess = $grafanaResult.Success -and $grafanaResult.Content.Contains('"database":"ok"')
Write-TestResult "Grafana API" $grafanaSuccess

# 12. Load Tests (if not skipped)
if (-not $SkipLoad) {
    Write-TestSection "12. Basic Load Tests"
    
    $jobs = @()
    for ($i = 1; $i -le 10; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($Url)
            try {
                Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 | Out-Null
                return $true
            }
            catch {
                return $false
            }
        } -ArgumentList "$ApiBaseUrl/health"
    }
    
    $results = $jobs | Wait-Job | Receive-Job
    $successCount = ($results | Where-Object { $_ -eq $true }).Count
    
    $jobs | Remove-Job
    
    Write-TestResult "Concurrent requests ($successCount/10 successful)" ($successCount -ge 8)
}

# Final Summary
Write-TestSection "📊 Test Summary"
$total = $TestResults.Passed + $TestResults.Failed + $TestResults.Skipped

Write-Host "Total Tests: $total" -ForegroundColor $Colors.White
Write-Host "Passed: $($TestResults.Passed)" -ForegroundColor $Colors.Green
Write-Host "Failed: $($TestResults.Failed)" -ForegroundColor $Colors.Red
Write-Host "Skipped: $($TestResults.Skipped)" -ForegroundColor $Colors.Yellow

$successRate = if ($total -gt 0) { [math]::Round(($TestResults.Passed / $total) * 100, 2) } else { 0 }
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { $Colors.Green } else { $Colors.Yellow })

if ($TestResults.Failed -eq 0) {
    Write-Host "`n🎉 All tests passed! The system is ready for use." -ForegroundColor $Colors.Green
} elseif ($successRate -ge 80) {
    Write-Host "`n⚠️ Most tests passed. Review failed tests before production use." -ForegroundColor $Colors.Yellow
} else {
    Write-Host "`n❌ Multiple test failures detected. System needs attention." -ForegroundColor $Colors.Red
}

Write-Host "`n🔧 Next Steps:" -ForegroundColor $Colors.Yellow
Write-Host "1. Monitor Grafana dashboards for system metrics"
Write-Host "2. Check application logs for warnings or errors"
Write-Host "3. Perform additional security testing if needed"
Write-Host "4. Set up automated monitoring and alerting"

Write-Host "`n🚀 Testing completed!" -ForegroundColor $Colors.Green
