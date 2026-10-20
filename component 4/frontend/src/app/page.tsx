// app/page.tsx — the dashboard is the main student workspace.
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
