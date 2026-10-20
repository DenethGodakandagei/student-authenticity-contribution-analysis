import React from 'react';
import Script from 'next/script';
import { AuthProvider } from '../context/AuthContext';
import './globals.css';
import NavigationLayout from './NavigationLayout'; // Client wrapper for the sidebar layout

export const metadata = {
  title: 'Inkie',
  description: 'Intelligent Document Revision & Evolution Analytics Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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
