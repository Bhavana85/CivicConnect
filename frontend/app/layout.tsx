import type { Metadata } from 'next';
import './globals.css';
import I18nProvider from '@/components/I18nProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'CivicConnect — ನಾಗರಿಕ ಸಂಪರ್ಕ',
  description: 'A multilingual civic tech platform for transparent municipal governance. Report issues, track budgets, and connect with your community.',
  keywords: 'civic tech, BBMP, Bengaluru, municipal, pothole, report, budget transparency',
  openGraph: {
    title: 'CivicConnect',
    description: 'Your Voice. Your City. | ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ನಗರ.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Kannada:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body suppressHydrationWarning>
        <Toaster position="top-center" toastOptions={{ duration: 3500, style: { fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' } }} />
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

