import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"

export const metadata = {
  title: 'Global Secure Send',
  description: 'Global payments and transfers',
  icons: {
    icon: '/globe.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GlobalSecure',
  },
  other: {
    google: 'notranslate',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark notranslate" translate="no">
      <body className="min-h-screen bg-background font-sans antialiased" translate="no">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
