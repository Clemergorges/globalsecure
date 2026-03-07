import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";

export const monitor = {
  /**
   * Logs error to both console (via Pino) and Sentry
   */
  error: (error: any, context?: Record<string, any>) => {
    // 1. Log structured error locally
    logger.error({ err: error, ...context }, 'Monitored Error');

    // 2. Send to Sentry with context
    Sentry.captureException(error, { 
        extra: context,
        tags: {
            environment: process.env.NODE_ENV
        }
    });
  },
  
  /**
   * Monitors execution time and alerts if exceeds threshold
   */
  performance: (name: string, duration: number, threshold = 1000) => {
    if (duration > threshold) {
      const message = `Performance Alert: ${name} took ${duration}ms (Threshold: ${threshold}ms)`;
      logger.warn({ duration, threshold, name }, message);
      
      Sentry.captureMessage(message, {
        level: "warning",
        extra: { duration, threshold, name },
        tags: { type: 'performance_degradation' }
      });
    }
  },

  /**
   * Business Logic Alert (e.g. High failure rate on payments)
   */
  alert: (message: string, level: Sentry.SeverityLevel = 'warning', context?: Record<string, any>) => {
      logger.warn(context, `Alert: ${message}`);
      Sentry.captureMessage(message, {
          level,
          extra: context
      });
  }
};