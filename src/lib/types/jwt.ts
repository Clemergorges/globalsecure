/**
 * JWT Type Definitions
 * Strongly typed JWT payload for authentication
 */

export interface JWTPayload {
    /** User ID */
    userId: string;

    /** User email */
    email: string;

    /** User role */
    role: 'USER' | 'ADMIN';

    /** Issued at (Unix timestamp) */
    iat: number;

    /** Expiration time (Unix timestamp) */
    exp: number;

    /** Optional: Device identifier */
    device?: string;

    /** Optional: Session ID */
    sessionId?: string;
}

/**
 * JWT Verification Result
 */
export interface JWTVerificationResult {
    valid: boolean;
    payload?: JWTPayload;
    error?: string;
}

/**
 * Session Data
 */
export interface SessionData {
    userId: string;
    email: string;
    role: 'USER' | 'ADMIN';
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
}
