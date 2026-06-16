'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

export default function AdminPage() {
  const router = useRouter();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/admin/login'); return; }
    router.replace('/admin/complaints');
  }, []);
  return null;
}
