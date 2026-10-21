// app/dashboard/page.tsx — student dashboard
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeGuideCard from '../components/dashboard/WelcomeGuideCard';
import NovaAvatarCard from '../components/dashboard/NovaAvatarCard';
import UploadMaterialModal from '../components/dashboard/UploadMaterialModal';
import {
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  subscribeAuth,
} from '../utils/api';
import { useRoleGuard } from '../utils/useRoleGuard';
import '../components/dashboard/dashboard.css';

export default function DashboardPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [showUploadModal, setShowUploadModal] = useState(false);

  let userName = '';
  if (userRaw) {
    try {
      userName = (JSON.parse(userRaw) as { name?: string }).name ?? '';
    } catch {
      userName = '';
    }
  }

  if (!ready) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="dash-page">
      <main className="dash-fullscreen-container">
        <NovaAvatarCard userName={userName} onTeachNow={() => setShowUploadModal(true)} />
      </main>

      <UploadMaterialModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSessionCreated={() => {}}
      />
    </div>
  );
}
