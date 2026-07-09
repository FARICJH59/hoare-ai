import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'HOARE.ai — Enterprise AI Assistant',
    template: '%s | HOARE.ai',
  },
  description:
    'HOARE.ai is an enterprise SaaS AI assistant that understands your goals, generates solutions, creates execution plans, and connects to QGPS for autonomous deployment.',
  keywords: ['AI assistant', 'enterprise', 'SaaS', 'project generation', 'QGPS', 'autonomous agents'],
  authors: [{ name: 'HOARE.ai' }],
  creator: 'HOARE.ai',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXTAUTH_URL,
    title: 'HOARE.ai — Enterprise AI Assistant',
    description: 'Enterprise SaaS AI powered by autonomous agents.',
    siteName: 'HOARE.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HOARE.ai — Enterprise AI Assistant',
    description: 'Enterprise SaaS AI powered by autonomous agents.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
