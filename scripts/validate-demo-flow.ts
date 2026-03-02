import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import axios from 'axios';
import { prisma } from '../src/lib/db';

// Base URL (assuming running locally on port 3000 as per package.json dev script)
const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

async function runDemoFlow() {
  console.log(`${colors.blue}🚀 Starting Security Demo Flow Validation...${colors.reset}\n`);

  try {
    // 1. Setup Test Users
    console.log(`${colors.yellow}📦 Using existing users...${colors.reset}`);
    // Assuming test users exist from seed or creating them on fly if needed
    const senderEmail = process.env.DEMO_SENDER_EMAIL || process.env.ADMIN_EMAIL || 'admin@example.com';
    const receiverEmail = process.env.DEMO_RECEIVER_EMAIL || 'receiver@example.com';
    const password = process.env.DEMO_SENDER_PASSWORD || process.env.TEST_PASSWORD || 'CHANGE_ME';
    
    console.log(`${colors.green}✔ Using credentials for ${senderEmail}${colors.reset}`);

    // 2. Test Login (Secure Route)
    console.log(`\n${colors.yellow}🔐 Testing Login Flow (/api/auth/login-secure)...${colors.reset}`);
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login-secure`, {
        email: senderEmail,
        password: password
    }, {
        validateStatus: () => true, // Don't throw on error
        // timeout: 10000 // Removed timeout to debug hang
    });

    if (loginRes.status !== 200) {
        console.error(`${colors.red}❌ Login Failed: ${loginRes.status} - ${JSON.stringify(loginRes.data)}${colors.reset}`);
        process.exit(1);
    }
    
    const cookie = loginRes.headers['set-cookie'];
    if (!cookie) {
         console.error(`${colors.red}❌ No cookie received!${colors.reset}`);
         process.exit(1);
    }
    console.log(`${colors.green}✔ Login Successful! Cookie received.${colors.reset}`);
    // Extract auth_token from cookie
    const authToken = cookie[0].split(';')[0];


    // 3. Test View Balance (Protected Route)
    console.log(`\n${colors.yellow}💰 Testing Balance View (/api/wallet/balance)...${colors.reset}`);
    const balanceRes = await axios.get(`${BASE_URL}/api/wallet/balance`, {
        headers: { Cookie: authToken },
        validateStatus: () => true
    });

    if (balanceRes.status !== 200) {
        console.error(`${colors.red}❌ Balance Check Failed: ${balanceRes.status} - ${JSON.stringify(balanceRes.data)}${colors.reset}`);
        process.exit(1);
    }
    console.log(`${colors.green}✔ Balance Retrieved: ${JSON.stringify(balanceRes.data.balances)}${colors.reset}`);


    // 4. Test Internal Transfer (Protected + Validated + Rate Limited)
    console.log(`\n${colors.yellow}💸 Testing Internal Transfer (/api/transfers/internal)...${colors.reset}`);
    
    // 4.1 Invalid Request (Validation Check)
    console.log(`  ${colors.blue}Testing Validation (Invalid Amount)...${colors.reset}`);
    const invalidRes = await axios.post(`${BASE_URL}/api/transfers/internal`, {
        toEmail: receiverEmail,
        amount: -100, // Invalid
        currency: 'EUR'
    }, {
        headers: { Cookie: authToken },
        validateStatus: () => true
    });
    
    if (invalidRes.status === 400) {
        console.log(`${colors.green}✔ Validation Caught Invalid Request (Status 400)${colors.reset}`);
    } else {
        console.error(`${colors.red}❌ Validation Failed to Catch Error: ${invalidRes.status}${colors.reset}`);
    }

    // 4.2 Valid Transfer
    console.log(`  ${colors.blue}Testing Valid Transfer...${colors.reset}`);
    const validTransferRes = await axios.post(`${BASE_URL}/api/transfers/internal`, {
        toEmail: receiverEmail,
        amount: 10.00,
        currency: 'EUR'
    }, {
        headers: { Cookie: authToken },
        validateStatus: () => true
    });

    if (validTransferRes.status === 200) {
        console.log(`${colors.green}✔ Transfer Successful!${colors.reset}`);
    } else {
        console.error(`${colors.red}❌ Transfer Failed: ${validTransferRes.status} - ${JSON.stringify(validTransferRes.data)}${colors.reset}`);
    }
    
    // 5. Rate Limit Test (Optional - fire 6 requests)
    console.log(`\n${colors.yellow}🛑 Testing Rate Limit (Firing 6 requests)...${colors.reset}`);
    let blocked = false;
    for (let i = 0; i < 6; i++) {
        // Add delay between requests to avoid connection reset issues locally
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const res = await axios.post(`${BASE_URL}/api/transfers/internal`, {
            toEmail: receiverEmail,
            amount: 1.00,
            currency: 'EUR'
        }, {
            headers: { Cookie: authToken },
            validateStatus: () => true
        });
        if (res.status === 429) {
            blocked = true;
            console.log(`${colors.green}✔ Request ${i+1} Blocked (429)${colors.reset}`);
            break;
        }
    }
    
    if (!blocked) {
        console.warn(`${colors.yellow}⚠ Rate limit might not have triggered (Check Redis/Config)${colors.reset}`);
    }

    console.log(`\n${colors.blue}🏁 Demo Validation Complete!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error);
  } finally {
    await prisma.$disconnect();
  }
}

runDemoFlow();
