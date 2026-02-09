const { PrismaClient } = require('@prisma/client');

const BASE_URL = 'http://localhost:3001';
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://staging_user:staging_pass@localhost:5433/globalsecuresend_staging?schema=public'
        }
    }
});

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function log(step, status, message) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} [${step}] ${message || ''}`);
}

async function runUAT() {
    console.log('🚀 Starting Automated UAT Validation...');
    console.log(`Target: ${BASE_URL}\n`);

    // 1. Health Check
    try {
        let attempts = 0;
        let healthy = false;
        while (attempts < 30 && !healthy) {
            try {
                const res = await fetch(`${BASE_URL}/api/health`);
                if (res.ok) healthy = true;
            } catch (e) {}
            if (!healthy) await sleep(2000);
            attempts++;
        }

        if (healthy) {
            await log('Health Check', 'PASS', 'API is responsive at /api/health');
        } else {
            await log('Health Check', 'FAIL', 'API did not respond after 60s');
            // process.exit(1); // Don't exit, try others
        }
    } catch (e) {
        await log('Health Check', 'FAIL', String(e));
    }

    // 2. Core Banking - User Creation
    const email = `uat_user_${Date.now()}@test.com`;
    const password = 'Password123!';
    let userId = '';

    try {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'UAT Tester',
                email,
                password,
                phone: `+551199999${Math.floor(Math.random()*10000)}`,
                country: 'LU',
                mainCurrency: 'EUR'
            })
        });

        if (res.status === 201 || res.status === 200) {
            const data = await res.json();
            userId = data.userId || data.user?.id;
            await log('User Registration', 'PASS', `Created user ${email}`);
        } else {
            const err = await res.text();
            throw new Error(`Registration failed: ${res.status} - ${err}`);
        }
    } catch (e) {
        await log('User Registration', 'FAIL', e.message);
    }

    // 3. Login
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (res.ok) {
            await log('User Login', 'PASS', 'Login successful');
        } else {
            throw new Error(`Login failed: ${res.status}`);
        }
    } catch (e) {
        await log('User Login', 'FAIL', e.message);
    }

    // 4. Admin KYC Approval (Direct DB)
    if (userId) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { kycStatus: 'APPROVED', kycLevel: 2 }
            });
            await log('KYC Approval', 'PASS', 'Updated user to APPROVED via DB');
        } catch (e) {
             await log('KYC Approval', 'FAIL', `DB Error: ${e.message}`);
        }
    }

    // 5. Rate Limiting Check
    await log('Rate Limiting', 'INFO', 'Testing 100 requests...');
    let blocked = false;
    for(let i=0; i<110; i++) {
        const res = await fetch(`${BASE_URL}/api/health`);
        if (res.status === 429) {
            blocked = true;
            break;
        }
    }
    if (blocked) {
        await log('Rate Limiting', 'PASS', 'Received 429 Too Many Requests');
    } else {
        await log('Rate Limiting', 'FAIL', 'Rate limit not triggered');
    }

    console.log('\n🏁 UAT Automated Check Complete.');
}

runUAT()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
