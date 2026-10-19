// app/login/page.tsx
'use client';

import AuthLayout from '../auth/AuthLayout';
import LoginForm from '../auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout mode="login">
      <LoginForm />
    </AuthLayout>
  );
}
