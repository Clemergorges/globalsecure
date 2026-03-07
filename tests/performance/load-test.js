import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

export default function () {
  // 1. Health Check (Public)
  const healthRes = http.get('http://localhost:3000/api/health');
  check(healthRes, { 'status was 200': (r) => r.status == 200 });

  // 2. Simulate Login (Mock) - In real test, obtain token first
  // const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({ email: 'user@test.com', password: 'password' }), { headers: { 'Content-Type': 'application/json' } });
  
  sleep(1);
}
