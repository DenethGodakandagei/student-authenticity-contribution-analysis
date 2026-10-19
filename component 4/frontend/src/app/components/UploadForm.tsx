// app/components/UploadForm.tsx
'use client';

import { useState } from 'react';
import { authHeaders } from "../utils/api";
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload-material`,
        {
          method: 'POST',
          body: formData,
          headers: authHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.session_id) {
        throw new Error(data.detail ?? 'Upload failed. Please try again.');
      }
      router.push(`/session/${data.session_id}/chat`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
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
      {error && (
        <p className="mb-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Start Session'}
      </button>
    </form>
  );
}
