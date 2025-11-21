#!/bin/bash

TARGET_URL="http://localhost:8080/campaigns"
CONCURRENCY=50
DURATION=60
TEMP_FILE="/tmp/api_avengers_load_test_$$"

echo "🚀 Starting Pure Bash Load Test"
echo "Target: $TARGET_URL"
echo "Concurrency: $CONCURRENCY workers"
echo "Duration: $DURATION seconds"
echo "----------------------------------------"

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping workers..."
    kill $(jobs -p) 2>/dev/null
    rm -f "$TEMP_FILE"
}
trap cleanup EXIT

# Initialize counter file
touch "$TEMP_FILE"

# Start Workers
for i in $(seq 1 $CONCURRENCY); do
    (
        while true; do
            # Run curl silently, outputting nothing.
            # On success (HTTP 2xx), append a byte to the temp file.
            # We use -w to only output a character if successful.
            curl -s -o /dev/null -w "." "$TARGET_URL" >> "$TEMP_FILE"
        done
    ) &
done

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

echo "Load test running... (Press Ctrl+C to stop early)"

# Monitor Loop
while [ $(date +%s) -lt $END_TIME ]; do
    sleep 1
    
    # Count bytes (requests)
    if [ -f "$TEMP_FILE" ]; then
        # Using stat to get size is faster than wc -c
        if [[ "$OSTYPE" == "darwin"* ]]; then
            REQUESTS=$(stat -f%z "$TEMP_FILE")
        else
            REQUESTS=$(stat -c%s "$TEMP_FILE")
        fi
        
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        
        if [ $ELAPSED -gt 0 ]; then
            RPS=$((REQUESTS / ELAPSED))
            echo -ne "\rCurrent RPS: $RPS | Total Requests: $REQUESTS   "
        fi
    fi
done

echo -e "\n\n========================================"
echo "🎉 Load Test Completed"
echo "========================================"

TOTAL_REQUESTS=0
if [ -f "$TEMP_FILE" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        TOTAL_REQUESTS=$(stat -f%z "$TEMP_FILE")
    else
        TOTAL_REQUESTS=$(stat -c%s "$TEMP_FILE")
    fi
fi

RPS=$((TOTAL_REQUESTS / DURATION))

echo "Total Requests: $TOTAL_REQUESTS"
echo "Duration:       ${DURATION}s"
echo "Average RPS:    $RPS"
echo "========================================"

if [ $RPS -ge 1000 ]; then
    echo "✅ SUCCESS: Target of 1000 RPS met!"
else
    echo "❌ FAILURE: Target of 1000 RPS not met."
fi
