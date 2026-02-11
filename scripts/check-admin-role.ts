
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'clemergorges@hotmail.com';
    console.log(`Checking role for ${email}...`);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error('User not found!');
        return;
    }

    // Since role is not in the schema provided in previous turn (it was removed or I missed it? let's check schema again),
    // Wait, I recall seeing `role` in the JWT payload logic in `auth.ts`, but let's check the schema file content from previous turn.
    // In schema.prisma read previously:
    // model User { ... no role field visible in the snippet ... }
    // Let's check if there is a role field. If not, how is isAdmin determined?
    // In `auth.ts`: 
    // export async function getSession() { ... isAdmin: payload.role === 'ADMIN' ... }
    // The payload comes from `SignJWT({ ... role: 'USER' })` in `login-secure/route.ts`.
    // It seems the role is currently hardcoded to 'USER' in the login route!
    // "role: 'USER' // or user.role if exists"
    
    // I need to update `login-secure/route.ts` to actually fetch the role or check against ADMIN_EMAIL.
    
    console.log('Current user data:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
