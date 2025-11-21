package main

import (
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

const (
	targetURL     = "http://localhost:8080/campaigns"
	concurrency   = 100 // Number of concurrent workers
	duration      = 60 * time.Second
)

func main() {
	fmt.Println("🚀 Starting High-Performance Load Test")
	fmt.Printf("Target: %s\n", targetURL)
	fmt.Printf("Concurrency: %d workers\n", concurrency)
	fmt.Printf("Duration: %v\n\n", duration)

	var (
		totalRequests uint64
		successCount  uint64
		failedCount   uint64
	)

	// Optimized HTTP Client
	client := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        1000,
			MaxIdleConnsPerHost: 1000,
			IdleConnTimeout:     90 * time.Second,
			DisableKeepAlives:   false,
		},
		Timeout: 10 * time.Second,
	}

	start := time.Now()
	done := make(chan struct{})

	// Timer to stop the test
	go func() {
		time.Sleep(duration)
		close(done)
	}()

	var wg sync.WaitGroup
	wg.Add(concurrency)

	// Worker Pool
	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			for {
				select {
				case <-done:
					return
				default:
					resp, err := client.Get(targetURL)
					atomic.AddUint64(&totalRequests, 1)
					
					if err == nil {
						if resp.StatusCode >= 200 && resp.StatusCode < 300 {
							atomic.AddUint64(&successCount, 1)
						} else {
							atomic.AddUint64(&failedCount, 1)
						}
						resp.Body.Close()
					} else {
						atomic.AddUint64(&failedCount, 1)
					}
				}
			}
		}()
	}

	// Stats Reporter
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				reqs := atomic.LoadUint64(&totalRequests)
				elapsed := time.Since(start).Seconds()
				rps := float64(reqs) / elapsed
				fmt.Printf("\rCurrent RPS: %.2f | Total: %d", rps, reqs)
			}
		}
	}()

	wg.Wait()
	ticker.Stop()

	elapsed := time.Since(start).Seconds()
	rps := float64(totalRequests) / elapsed

	fmt.Println("\n\n========================================")
	fmt.Println("🎉 Load Test Completed")
	fmt.Println("========================================")
	fmt.Printf("Total Requests: %d\n", totalRequests)
	fmt.Printf("Success:        %d\n", successCount)
	fmt.Printf("Failed:         %d\n", failedCount)
	fmt.Printf("Duration:       %.2fs\n", elapsed)
	fmt.Printf("Average RPS:    %.2f\n", rps)
	fmt.Println("========================================")

	if rps >= 1000 {
		fmt.Println("✅ SUCCESS: Target of 1000 RPS met!")
	} else {
		fmt.Println("❌ FAILURE: Target of 1000 RPS not met.")
	}
}

