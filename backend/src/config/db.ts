import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let prisma: PrismaClient | null = null;
let isConnected = false;

try {
  prisma = new PrismaClient({
    log: ['error', 'warn']
  });
} catch (err) {
  console.warn('Prisma Client failed to instantiate:', err);
}

export async function checkDbConnection(): Promise<{ connected: boolean; message: string }> {
  if (!prisma) {
    return { connected: false, message: 'Prisma client not initialized' };
  }
  try {
    // Attempt a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    return { connected: true, message: 'Connected to MySQL via Prisma' };
  } catch (error: any) {
    isConnected = false;
    return { connected: false, message: error.message || 'Cannot connect to MySQL database' };
  }
}

export { prisma, isConnected };
