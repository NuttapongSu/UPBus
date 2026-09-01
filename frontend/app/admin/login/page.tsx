'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await adminLogin(username, password);
      if (data.token) {
        setToken(data.token);
        router.push('/admin');
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14]">
      <form onSubmit={handleSubmit} className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-sm border border-[#2a2a4a]">
        <h1 className="text-xl font-bold mb-6">เข้าสู่ระบบ Admin</h1>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <input
          className="w-full bg-[#111] border border-[#2a2a4a] rounded-lg px-4 py-2 mb-3 outline-none"
          placeholder="ชื่อผู้ใช้" value={username} onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full bg-[#111] border border-[#2a2a4a] rounded-lg px-4 py-2 mb-6 outline-none"
          placeholder="รหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)}
        />
        <button
          type="submit" disabled={loading}
          className="w-full bg-brand-green text-black font-bold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
