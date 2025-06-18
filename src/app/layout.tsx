
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/layout/providers';
import { AuthProvider } from '@/contexts/auth-context';
import { CompanyProfileProvider } from '@/contexts/company-profile-context';

const APP_NAME = "TransitFlow App"; // Default, can be dynamic if manifest generation is dynamic
const APP_DESCRIPTION = "Gestion de transit et logistique";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
    // startupImage: [], // TODO: Add startup images for iOS
  },
  formatDetection: {
    telephone: false,
  },
  // themeColor: "#5DADE2", // Moved to meta tags for more control
  // openGraph: { // Optional: For social sharing
  //   type: "website",
  //   siteName: APP_NAME,
  //   title: {
  //     default: APP_NAME,
  //     template: `%s - ${APP_NAME}`,
  //   },
  //   description: APP_DESCRIPTION,
  // },
  // twitter: { // Optional: For Twitter card
  //   card: "summary",
  //   title: {
  //     default: APP_NAME,
  //     template: `%s - ${APP_NAME}`,
  //   },
  //   description: APP_DESCRIPTION,
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#5DADE2" /> 
        <link rel="manifest" href="/manifest.json" />
        {/* You will need to create these icon files in public/icons/ */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Add other PWA related meta tags or link tags here if needed */}
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          <AuthProvider>
            <CompanyProfileProvider>
              {children}
            </CompanyProfileProvider>
          </AuthProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
