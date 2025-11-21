package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

var allTargets = []string{
	"http://localhost:8080/campaigns",
	"http://localhost:8080/health",
	"http://localhost:8080/campaigns/1",
}

var singleTarget = []string{
	"http://localhost:8080/campaigns",
}

const (
	concurrency = 200
	phaseDuration = 20 * time.Second
)

func main() {
	fmt.Println("🚀 Starting Phased High-Performance Load Test")
	
	// Phase 1: Multi-Endpoint
	fmt.Println("\n--- PHASE 1: Multi-Endpoint Load (20s) ---")
	runPhase(allTargets, phaseDuration)

	// Phase 2: Single-Endpoint
	fmt.Println("\n--- PHASE 2: Single-Endpoint Load (/campaigns) (20s) ---")
	runPhase(singleTarget, phaseDuration)

	fmt.Println("\n✅ Load Test Complete")
}

func runPhase(targets []string, duration time.Duration) {
	fmt.Printf("Targets: %v\n", targets)
	fmt.Printf("Concurrency: %d workers\n", concurrency)
	
	var (
		totalRequests uint64
		successCount  uint64
		failedCount   uint64
	)

	client := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        1000,
			MaxIdleConnsPerHost: 1000,
			IdleConnTimeout:     90 * time.Second,
			DisableKeepAlives:   false,
		},
		Timeout: 5 * time.Second,
	}

	start := time.Now()
	done := make(chan struct{})

	go func() {
		time.Sleep(duration)
		close(done)
	}()

	var wg sync.WaitGroup
	wg.Add(concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(i)))
			
			for {
				select {
				case <-done:
					return
				default:
					url := targets[r.Intn(len(targets))]
					resp, err := client.Get(url)
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

	fmt.Println("\n\n--- Phase Summary ---")
	fmt.Printf("Total Requests: %d\n", totalRequests)
	fmt.Printf("Success:        %d\n", successCount)
	fmt.Printf("Failed:         %d\n", failedCount)
	fmt.Printf("Average RPS:    %.2f\n", rps)
	
	if rps >= 1000 {
		fmt.Println("✅ Target met (>1000 RPS)")
	} else {
		fmt.Println("❌ Target NOT met (<1000 RPS)")
	}
}
