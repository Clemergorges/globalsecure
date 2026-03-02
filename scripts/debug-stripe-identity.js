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

async function main() {
  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  const email = process.env.CSP_EMAIL || process.env.LOADTEST_EMAIL || 'phase3.user@gss.dev'
  const password = process.env.CSP_PASSWORD || process.env.LOADTEST_PASSWORD || 'dev123'
  const cookie = await login({ baseUrl, email, password })

  const res = await fetch(`${baseUrl}/api/kyc/stripe-identity`, {
    method: 'POST',
    headers: { cookie },
  })

  const bodyText = await res.text().catch(() => '')
  let body = null
  try {
    body = bodyText ? JSON.parse(bodyText) : null
  } catch {
    body = bodyText
  }

  process.stdout.write(`status: ${res.status}\n`)
  process.stdout.write(`body: ${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}\n`)
}

main().catch((e) => {
  process.stderr.write(`${e?.stack || e}\n`)
  process.exit(1)
})

