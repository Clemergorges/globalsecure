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

async function printHeader({ baseUrl, cookie, path }) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { cookie } })
  const csp = res.headers.get('content-security-policy')
  process.stdout.write(`${path} -> ${res.status}\n`)
  process.stdout.write(`content-security-policy: ${csp || '(missing)'}\n\n`)
}

async function main() {
  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  const email = process.env.CSP_EMAIL || process.env.LOADTEST_EMAIL || 'phase3.user@gss.dev'
  const password = process.env.CSP_PASSWORD || process.env.LOADTEST_PASSWORD || 'dev123'

  const cookie = await login({ baseUrl, email, password })

  await printHeader({ baseUrl, cookie, path: '/dashboard/settings/kyc' })
  await printHeader({ baseUrl, cookie, path: '/api/kyc/status' })
}

main().catch((e) => {
  process.stderr.write(`${e?.stack || e}\n`)
  process.exit(1)
})

