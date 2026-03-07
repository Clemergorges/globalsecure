/**
 * Admin Service
 * Centralized logic for admin user management
 */

/**
 * Check if email is an admin
 */
export function isAdmin(email: string): boolean {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.warn('⚠️ ADMIN_EMAIL not set in environment variables');
        return false;
    }

    return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Check if user ID is an admin
 * @param userId - User ID to check
 * @param userEmail - User email (optional, for performance)
 */
export async function isAdminById(
    userId: string,
    userEmail?: string
): Promise<boolean> {
    // If email is provided, use it directly
    if (userEmail) {
        return isAdmin(userEmail);
    }

    // Otherwise, fetch from database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user) {
            return false;
        }

        return isAdmin(user.email);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Get admin email from environment
 */
export function getAdminEmail(): string | undefined {
    return process.env.ADMIN_EMAIL;
}

/**
 * Validate admin access
 * Throws error if not admin
 */
export function requireAdmin(email: string): void {
    if (!isAdmin(email)) {
        throw new Error('Unauthorized: Admin access required');
    }
}

/**
 * Get admin permissions
 */
export function getAdminPermissions(): string[] {
    return [
        'VIEW_ALL_USERS',
        'VIEW_ALL_TRANSACTIONS',
        'MANAGE_KYC',
        'MANAGE_CARDS',
        'VIEW_ANALYTICS',
        'MANAGE_SETTINGS',
        'VIEW_LOGS',
    ];
}

/**
 * Check if user has specific admin permission
 */
export function hasAdminPermission(
    email: string,
    permission: string
): boolean {
    if (!isAdmin(email)) {
        return false;
    }

    const permissions = getAdminPermissions();
    return permissions.includes(permission);
}
