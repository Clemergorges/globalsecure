const { setTimeout: sleep } = require('timers/promises')
const { performance } = require('perf_hooks')

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

async function login({ baseUrl, email, password }) {
  const res = await fetch(`${baseUrl}/api/auth/login-secure`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Login failed: ${res.status} ${text}`)
  }

  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/auth_token=[^;]+/)
  if (!match) throw new Error('Login succeeded but auth_token cookie not found')
  return match[0]
}

async function timedFetch(url, options) {
  const t0 = performance.now()
  let status = 0
  let ok = false
  try {
    const res = await fetch(url, options)
    status = res.status
    ok = res.ok
    await res.arrayBuffer().catch(() => null)
  } catch (e) {
    status = 0
    ok = false
  }
  const dt = performance.now() - t0
  return { ok, status, ms: dt }
}

async function main() {
  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  const email = process.env.LOADTEST_EMAIL || 'phase3.user@gss.dev'
  const password = process.env.LOADTEST_PASSWORD || 'dev123'
  const seconds = Math.max(1, Number(process.env.LOADTEST_SECONDS || '20') || 20)
  const concurrency = Math.max(1, Math.floor(Number(process.env.LOADTEST_CONCURRENCY || '10') || 10))

  const cookie = await login({ baseUrl, email, password })
  const endpoints = [
    { name: 'KYC status', method: 'GET', path: '/api/kyc/status' },
    { name: 'Yield power', method: 'GET', path: '/api/yield/power' },
    { name: 'Yield summary', method: 'GET', path: '/api/yield/summary' },
    { name: 'Ops flags', method: 'GET', path: '/api/ops/flags' },
  ]

  const deadline = Date.now() + seconds * 1000
  const latencies = []
  const failures = new Map()
  let total = 0

  async function worker() {
    while (Date.now() < deadline) {
      const ep = pick(endpoints)
      const url = `${baseUrl}${ep.path}`
      const r = await timedFetch(url, {
        method: ep.method,
        headers: {
          cookie,
          'user-agent': 'loadtest-modules/1.0',
        },
      })
      total += 1
      latencies.push(r.ms)
      if (!r.ok) {
        const key = `${ep.path}:${r.status}`
        failures.set(key, (failures.get(key) || 0) + 1)
      }
      await sleep(5)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  latencies.sort((a, b) => a - b)
  const okCount = total - Array.from(failures.values()).reduce((a, b) => a + b, 0)
  const failCount = total - okCount

  const report = {
    baseUrl,
    seconds,
    concurrency,
    totalRequests: total,
    okRequests: okCount,
    failedRequests: failCount,
    latencyMs: {
      p50: Number(percentile(latencies, 50).toFixed(2)),
      p90: Number(percentile(latencies, 90).toFixed(2)),
      p95: Number(percentile(latencies, 95).toFixed(2)),
      p99: Number(percentile(latencies, 99).toFixed(2)),
      max: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
    },
    failures: Object.fromEntries(Array.from(failures.entries()).sort((a, b) => b[1] - a[1])),
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((e) => {
  process.stderr.write(`${e?.stack || e}\n`)
  process.exit(1)
})

