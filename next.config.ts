import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";
import * as path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const stripeCspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://b.stripecdn.com https://js.stripe.com blob:;
  style-src 'self' 'unsafe-inline' https://b.stripecdn.com;
  frame-src 'self' https://verify.stripe.com https://js.stripe.com;
  connect-src 'self' https://api.stripe.com https://verify.stripe.com;
  img-src 'self' data: https:;
  font-src 'self' data:;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: '/dashboard/settings/kyc',
        headers: [{ key: 'Content-Security-Policy', value: stripeCspHeader }],
      },
      {
        source: '/api/kyc/:path*',
        headers: [{ key: 'Content-Security-Policy', value: stripeCspHeader }],
      },
    ];
  },
};

const intlConfig = withNextIntl(nextConfig);

export default withSentryConfig(intlConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "globalsecuresend",
  project: "globalsecuresend",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    reactComponentAnnotation: {
      enabled: true,
    },
    automaticVercelMonitors: true,
  },
});
