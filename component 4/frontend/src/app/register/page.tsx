// app/register/page.tsx
'use client';

import AuthLayout from '../auth/AuthLayout';
import RegisterForm from '../auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthLayout mode="register">
      <RegisterForm />
    </AuthLayout>
  );
}
