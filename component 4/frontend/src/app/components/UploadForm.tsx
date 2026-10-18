// app/components/UploadForm.tsx
'use client';

import { useState } from 'react';
import { apiRequest } from "../utils/api";
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload-material`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const { session_id } = await res.json();
      router.push(`/session/${session_id}/chat`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-xl mb-4">Upload Lecture PDF</h2>
      <input
        type="file"
        accept=".pdf"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-4"
      />
      <button type="submit" className="button" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Start Session'}
      </button>
    </form>
  );
}
