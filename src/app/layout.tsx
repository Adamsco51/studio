
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/layout/providers';
import { AuthProvider } from '@/contexts/auth-context';
import { CompanyProfileProvider } from '@/contexts/company-profile-context'; // Import CompanyProfileProvider

export const metadata: Metadata = {
  title: 'TransitFlow', // This can be made dynamic later if needed
  description: 'Gestion de transit et logistique',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          <AuthProvider>
            <CompanyProfileProvider> {/* Wrap with CompanyProfileProvider */}
              {children}
            </CompanyProfileProvider>
          </AuthProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
