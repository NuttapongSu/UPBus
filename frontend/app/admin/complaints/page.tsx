'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { adminFetch } from '@/lib/api';

const TOPIC_LABEL: Record<string, string> = {
  'driver-service': 'พฤติกรรมคนขับ',
  'bus-condition': 'สภาพรถ',
  'system-wrong': 'ระบบผิดปกติ',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  resolved: 'แก้ไขแล้ว',
};

export default function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const { data, mutate } = useSWR(
    `/api/complaints?page=${page}`,
    () => adminFetch<any>(`/api/complaints?page=${page}`)
  );

  async function updateStatus(id: number, status: string) {
    await adminFetch(`/api/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    mutate();
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">จัดการร้องเรียน</h2>
      <p className="text-sm text-gray-400 mb-4">ทั้งหมด {data?.total ?? '—'} รายการ</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-[#2a2a4a]">
              <th className="text-left py-2 pr-4">ID</th>
              <th className="text-left py-2 pr-4">หัวข้อ</th>
              <th className="text-left py-2 pr-4">รถ</th>
              <th className="text-left py-2 pr-4">รายละเอียด</th>
              <th className="text-left py-2 pr-4">สถานะ</th>
              <th className="text-left py-2">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {(data?.complaints || []).map((c: any) => (
              <tr key={c.id} className="border-b border-[#1e1e2e] hover:bg-[#1a1a2e]">
                <td className="py-2 pr-4 text-gray-400">#{c.id}</td>
                <td className="py-2 pr-4">{TOPIC_LABEL[c.topic] || c.topic}</td>
                <td className="py-2 pr-4">{c.bus_number || '—'}</td>
                <td className="py-2 pr-4 max-w-xs truncate">{c.detail}</td>
                <td className="py-2 pr-4">
                  <select
                    value={c.status || 'pending'}
                    onChange={e => updateStatus(c.id, e.target.value)}
                    className="bg-[#111] border border-[#2a2a4a] rounded px-2 py-1 text-xs"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-gray-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1 bg-[#1a1a2e] rounded text-sm disabled:opacity-40">ก่อนหน้า</button>
        <span className="text-sm text-gray-400 py-1">หน้า {page} / {data?.totalPages ?? 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}
          className="px-3 py-1 bg-[#1a1a2e] rounded text-sm disabled:opacity-40">ถัดไป</button>
      </div>
    </div>
  );
}
