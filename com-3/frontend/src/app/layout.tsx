import React from 'react';
import Script from 'next/script';
import { AuthProvider } from '../context/AuthContext';
import './globals.css';
import NavigationLayout from './NavigationLayout'; // Client wrapper for the sidebar layout

export const metadata = {
  title: 'Inkie',
  description: 'Intelligent Document Revision & Evolution Analytics Platform',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
      </head>
      <body>
        <AuthProvider>
          <NavigationLayout>
            {children}
          </NavigationLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
