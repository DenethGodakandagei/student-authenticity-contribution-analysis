import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import './globals.css';
import NavigationLayout from './NavigationLayout'; // Client wrapper for the sidebar layout

export const metadata = {
  title: 'DocAnalytics',
  description: 'Document Revision Analytics Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
