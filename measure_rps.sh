#!/bin/bash

echo "🚀 Starting Performance Test..."
echo "Target: 1000 RPS"
echo "Duration: 60 seconds"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Go is not installed. Please install Go to run the load test."
    exit 1
fi

cd loadtest

echo "Building load test tool..."
go build -o loadtest .

echo "Running load test..."
./loadtest &
PID=$!

sleep 60

kill $PID

echo -e "\nTest completed."
echo "Please check the final RPS number in the output above."
