# Use official Node.js LTS (Alpine for size)
FROM node:20-alpine AS builder

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# ==========================================
# Production Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Install only production dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --only=production --legacy-peer-deps

# Copy built assets from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start app
CMD ["npm", "start"]
