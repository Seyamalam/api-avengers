$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Performance Test..."
Write-Host "Target: 1000 RPS"
Write-Host "Duration: 60 seconds"

# Check if Go is installed
if (-not (Get-Command "go" -ErrorAction SilentlyContinue)) {
    Write-Error "Go is not installed. Please install Go to run the load test."
    exit 1
}

# Change to loadtest directory
Push-Location "loadtest"

try {
    # Run the load test and capture output
    # We use Start-Process to run it and redirect output, but for simplicity in this script
    # and to see live output, we'll just run it directly and let the user see the console.
    # However, to parse the RPS, we need to capture it.
    
    Write-Host "Building load test tool..."
    go build -o loadtest.exe .
    
    Write-Host "Running load test..."
    .\loadtest.exe
    
    Write-Host "`nTest completed."
    Write-Host "Please check the final RPS number in the output above."
    
} finally {
    Pop-Location
}
