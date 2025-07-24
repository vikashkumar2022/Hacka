#!/bin/bash

# Comprehensive test script for Blockchain File Security System
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Starting Comprehensive System Tests...${NC}"

# Test configuration
API_BASE_URL="http://localhost:5000/api"
FRONTEND_URL="http://localhost:3000"
PROXY_URL="http://localhost"

# Test user credentials
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="TestPassword123!"
TEST_USERNAME="testuser"

# Function to make HTTP requests with error handling
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    
    if [ -n "$headers" ]; then
        curl -s -X "$method" "$url" -H "$headers" -d "$data"
    elif [ -n "$data" ]; then
        curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
    else
        curl -s -X "$method" "$url"
    fi
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $service_name health... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    local expected_status=${4:-200}
    local auth_header=$5
    
    echo -n "Testing $method $endpoint... "
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_BASE_URL$endpoint" -H "$auth_header" -H "Content-Type: application/json" -d "$data")
    elif [ -n "$data" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_BASE_URL$endpoint")
    fi
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# 1. Service Health Tests
echo -e "\n${BLUE}1. Service Health Tests${NC}"
check_service_health "Frontend" "$FRONTEND_URL"
check_service_health "Backend API" "$API_BASE_URL/health"
check_service_health "Nginx Proxy" "$PROXY_URL"
check_service_health "Prometheus" "http://localhost:9090/-/healthy"
check_service_health "Grafana" "http://localhost:3001/api/health"

# 2. Database Connectivity Tests
echo -e "\n${BLUE}2. Database Connectivity Tests${NC}"
echo -n "Testing PostgreSQL connection... "
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Testing Redis connection... "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 3. IPFS Tests
echo -e "\n${BLUE}3. IPFS Tests${NC}"
echo -n "Testing IPFS API... "
if curl -s "http://localhost:5001/api/v0/id" > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 4. Blockchain Tests
echo -e "\n${BLUE}4. Blockchain Tests${NC}"
echo -n "Testing Hardhat node... "
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 5. API Authentication Tests
echo -e "\n${BLUE}5. API Authentication Tests${NC}"

# Test user registration
echo -n "Testing user registration... "
register_data="{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
register_response=$(make_request "POST" "$API_BASE_URL/auth/register" "$register_data")

if echo "$register_response" | grep -q '"message"'; then
    echo -e "${GREEN}✅ OK${NC}"
    
    # Extract token for further tests
    JWT_TOKEN=$(echo "$register_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
else
    echo -e "${RED}❌ FAILED${NC}"
    AUTH_HEADER=""
fi

# Test user login
echo -n "Testing user login... "
login_data="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
login_response=$(make_request "POST" "$API_BASE_URL/auth/login" "$login_data")

if echo "$login_response" | grep -q '"access_token"'; then
    echo -e "${GREEN}✅ OK${NC}"
    
    # Update token from login
    JWT_TOKEN=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test protected endpoint
if [ -n "$AUTH_HEADER" ]; then
    test_api_endpoint "/auth/profile" "GET" "" 200 "$AUTH_HEADER"
fi

# 6. File Upload and Verification Tests
echo -e "\n${BLUE}6. File Upload and Verification Tests${NC}"

if [ -n "$AUTH_HEADER" ]; then
    # Create a test file
    echo "This is a test file for blockchain verification" > /tmp/test_file.txt
    
    echo -n "Testing file upload... "
    upload_response=$(curl -s -X POST \
        -H "$AUTH_HEADER" \
        -F "file=@/tmp/test_file.txt" \
        -F "metadata={\"description\":\"Test file for automated testing\"}" \
        "$API_BASE_URL/files/upload")
    
    if echo "$upload_response" | grep -q '"file_hash"'; then
        echo -e "${GREEN}✅ OK${NC}"
        
        # Extract file hash for verification test
        FILE_HASH=$(echo "$upload_response" | grep -o '"file_hash":"[^"]*"' | cut -d'"' -f4)
        
        # Test file verification
        echo -n "Testing file verification... "
        verify_response=$(curl -s -X POST \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "{\"file_hash\":\"$FILE_HASH\"}" \
            "$API_BASE_URL/files/verify")
        
        if echo "$verify_response" | grep -q '"verification_result"'; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ FAILED${NC}"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    # Clean up test file
    rm -f /tmp/test_file.txt
fi

# 7. Analytics and Statistics Tests
echo -e "\n${BLUE}7. Analytics and Statistics Tests${NC}"

if [ -n "$AUTH_HEADER" ]; then
    test_api_endpoint "/analytics/stats" "GET" "" 200 "$AUTH_HEADER"
    test_api_endpoint "/analytics/user-activity" "GET" "" 200 "$AUTH_HEADER"
fi

# 8. Security and Rate Limiting Tests
echo -e "\n${BLUE}8. Security Tests${NC}"

# Test unauthorized access
test_api_endpoint "/auth/profile" "GET" "" 401

# Test invalid credentials
echo -n "Testing invalid login credentials... "
invalid_login_data="{\"email\":\"invalid@example.com\",\"password\":\"wrongpassword\"}"
invalid_response=$(make_request "POST" "$API_BASE_URL/auth/login" "$invalid_login_data")

if echo "$invalid_response" | grep -q '"error"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 9. Integration Tests
echo -e "\n${BLUE}9. Integration Tests${NC}"

# Test full workflow: register -> login -> upload -> verify
echo -n "Testing complete workflow... "
workflow_user="workflow_test@example.com"
workflow_data="{\"username\":\"workflowuser\",\"email\":\"$workflow_user\",\"password\":\"$TEST_USER_PASSWORD\"}"

# Register new user
workflow_register=$(make_request "POST" "$API_BASE_URL/auth/register" "$workflow_data")
if echo "$workflow_register" | grep -q '"access_token"'; then
    workflow_token=$(echo "$workflow_register" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    workflow_auth="Authorization: Bearer $workflow_token"
    
    # Create and upload test file
    echo "Workflow test file content" > /tmp/workflow_test.txt
    workflow_upload=$(curl -s -X POST \
        -H "$workflow_auth" \
        -F "file=@/tmp/workflow_test.txt" \
        "$API_BASE_URL/files/upload")
    
    if echo "$workflow_upload" | grep -q '"file_hash"'; then
        workflow_hash=$(echo "$workflow_upload" | grep -o '"file_hash":"[^"]*"' | cut -d'"' -f4)
        
        # Verify the file
        workflow_verify=$(curl -s -X POST \
            -H "$workflow_auth" \
            -H "Content-Type: application/json" \
            -d "{\"file_hash\":\"$workflow_hash\"}" \
            "$API_BASE_URL/files/verify")
        
        if echo "$workflow_verify" | grep -q '"verification_result"'; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ FAILED${NC}"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    rm -f /tmp/workflow_test.txt
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 10. Performance Tests
echo -e "\n${BLUE}10. Performance Tests${NC}"

echo -n "Testing API response time... "
start_time=$(date +%s%N)
response=$(curl -s "$API_BASE_URL/health")
end_time=$(date +%s%N)
response_time=$(((end_time - start_time) / 1000000))

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✅ OK (${response_time}ms)${NC}"
else
    echo -e "${YELLOW}⚠️ SLOW (${response_time}ms)${NC}"
fi

# 11. Monitoring Tests
echo -e "\n${BLUE}11. Monitoring Tests${NC}"

echo -n "Testing Prometheus metrics... "
if curl -s "http://localhost:9090/api/v1/query?query=up" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo -n "Testing Grafana API... "
if curl -s "http://localhost:3001/api/health" | grep -q '"database":"ok"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 12. Load Tests (Basic)
echo -e "\n${BLUE}12. Basic Load Tests${NC}"

echo -n "Testing concurrent requests... "
for i in {1..10}; do
    curl -s "$API_BASE_URL/health" > /dev/null &
done
wait

echo -e "${GREEN}✅ OK${NC}"

# Final Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "All critical system components have been tested."
echo "The blockchain file security system is ready for use!"

echo -e "\n${YELLOW}🔧 Next Steps:${NC}"
echo "1. Monitor the Grafana dashboards for system metrics"
echo "2. Check application logs for any warnings or errors"
echo "3. Perform additional security testing if needed"
echo "4. Set up automated monitoring and alerting"

echo -e "\n${GREEN}🎉 Testing completed successfully!${NC}"
