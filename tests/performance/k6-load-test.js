
// This file defines the K6 Performance Test Plan
// Usage: k6 run load-test.js

/*
 * 4. Plano de Testes de Performance
 * 4.1. Load Test: 1.000 req/min
 * 4.2. Stress Test: Breakpoint Discovery
 * 4.3. Soak Test: Endurance (12h - simulated short)
 */

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 requests
      timeUnit: '1m', // per minute
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 2000, duration: '2m' }, // Ramp up to double load
        { target: 5000, duration: '2m' }, // Breakpoint search
      ],
      startTime: '5m', // After load test
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must be < 200ms
    http_req_failed: ['rate<0.001'], // < 0.1% errors
  },
};

// Simulated Test Logic (Since we can't run K6 binary inside this env directly, we document the plan)
// In a real CI/CD pipeline, this file would be executed against the staging URL.
