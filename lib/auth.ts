import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
export const ADMIN_EMAIL = 'clemergorges@hotmail.com';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Short lived access token
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function checkAdmin() {
  const session = await getSession();
  // @ts-ignore
  if (!session || session.email !== ADMIN_EMAIL) {
    return false;
  }
  return true;
}