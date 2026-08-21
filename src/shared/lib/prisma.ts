import { PrismaClient } from '@prisma/client';

/**
 * 全局单例 PrismaClient，避免开发热重载时连接泄漏。
 * 事实源：平台业务对象（PRD I-1）。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
