$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Performance Test..."
Write-Host "Target: >1000 RPS"
Write-Host "Duration: 60 seconds"

# Check if Go is installed
if (-not (Get-Command "go" -ErrorAction SilentlyContinue)) {
    Write-Error "Go is not installed. Please install Go to run the load test."
    exit 1
}

# Change to loadtest directory
Push-Location "loadtest"

try {
    Write-Host "Building load test tool..."
    go build -o loadtest.exe .
    
    Write-Host "Running load test..."
    .\loadtest.exe
    
    Write-Host "`nTest completed."
    
} finally {
    Pop-Location
}
