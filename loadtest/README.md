# Load Testing Tool

Continuous load generator for the CareForAll API system.

## Features

- **5 Pledge Workers**: Continuously create pledges (1-5 sec intervals)
- **3 Campaign Viewers**: Constantly viewing campaigns (0.5-2 sec intervals)
- **1 Campaign Creator**: Creates new campaigns every 30-60 seconds
- **1 User Registration Worker**: Registers new users every 10-20 seconds

## Usage

```bash
# Run the load test
cd loadtest
go run main.go
```

## Stats Display

The tool displays real-time statistics every 5 seconds:
- Total requests
- Success count and rate
- Failed requests
- Pledges created
- Campaign views
- Requests per second (RPS)

## Configuration

Edit `main.go` to adjust:
- Number of workers
- Request intervals
- Pledge amounts
- Campaign goal amounts
