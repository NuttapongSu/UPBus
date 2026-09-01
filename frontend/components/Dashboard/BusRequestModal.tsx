'use client';
import { useState, useEffect } from 'react';
import { COLORS } from '@/lib/theme';

const DEPARTMENTS = [
  'คณะวิทยาศาสตร์','คณะวิศวกรรมศาสตร์','คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
  'คณะแพทยศาสตร์','คณะทันตแพทยศาสตร์','คณะพยาบาลศาสตร์','คณะเภสัชศาสตร์',
  'คณะสาธารณสุขศาสตร์และเวชศาสตร์ชุมชน','คณะสหเวชศาสตร์','คณะศิลปศาสตร์',
  'คณะนิติศาสตร์','คณะรัฐศาสตร์และสังคมศาสตร์','คณะบริหารธุรกิจและนิเทศศาสตร์',
  'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ','คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
  'วิทยาลัยการศึกษา','วิทยาลัยการจัดการ','วิทยาลัยพลังงานและสิ่งแวดล้อม',
  'สถาบันนวัตกรรมการเรียนรู้','โรงเรียนสาธิตมหาวิทยาลัยพะเยา','วิทยาเขตเชียงราย',
  'สำนักงานอธิการบดี','สำนักงานสภามหาวิทยาลัยพะเยา','สำนักงานตรวจสอบภายใน',
  'สำนักงานประกันคุณภาพการศึกษา',
  'กองกลาง','กองบริการการศึกษา','กองการเจ้าหน้าที่','กองแผนงาน','กองคลัง',
  'กองอาคารสถานที่','กองกิจการนิสิต','กองบริหารงานวิจัย',
  'ศูนย์บริการวิชาการ','ศูนย์การแพทย์และโรงพยาบาลมหาวิทยาลัยพะเยา',
  'ศูนย์บริการเทคโนโลยีสารสนเทศและการสื่อสาร','ศูนย์สิ่งแวดล้อมนวัตกรรม',
  'โรงพยาบาลทันตกรรม มหาวิทยาลัยพะเยา','งานวิเทศสัมพันธ์',
];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Props { onClose: () => void; }
type Step = 'form' | 'success';

export default function BusRequestModal({ onClose }: Props) {
  const [step, setStep]           = useState<Step>('form');
  const [loading, setLoading]     = useState(false);
  const [errMsg, setErrMsg]       = useState('');
  const [assignedBuses, setAssigned] = useState<string[]>([]);
  const [availability, setAvail]  = useState<{ remaining: number; max: number } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [allDay, setAllDay]       = useState(false);
  const [form, setForm] = useState({
    department: '',
    reserved_date: today,
    bus_count: '1',
    coordinator_name: '', coordinator_phone: '',
    note: '',
    start_time: '', end_time: '',
  });

  const maxBus = Math.min(3, availability?.remaining ?? 3);

  useEffect(() => {
    fetch(`${API}/api/reservations/availability?date=${form.reserved_date}`)
      .then(r => r.json())
      .then(d => {
        setAvail(d);
        // ปรับ bus_count ถ้าเกิน remaining
        setForm(f => ({ ...f, bus_count: String(Math.min(parseInt(f.bus_count) || 1, Math.min(3, d.remaining || 1))) }));
      })
      .catch(() => {});
  }, [form.reserved_date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allDay && (!form.start_time || !form.end_time)) {
      setErrMsg('กรุณาระบุเวลาเริ่มและเวลาเลิก หรือเลือก "ทั้งวัน"');
      return;
    }
    setLoading(true); setErrMsg('');

    try {
      const res  = await fetch(`${API}/api/reservations/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, all_day: allDay ? '1' : '0' }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || 'เกิดข้อผิดพลาด'); }
      else { setAssigned(data.assigned_buses || []); setStep('success'); }
    } catch { setErrMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
    finally { setLoading(false); }
  }

  const inputCls = 'w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple';

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
      <div className="w-full max-w-lg bg-[#0f0f1a] rounded-2xl border border-[#2a2a4a] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a4a]">
          <div>
            <h2 className="text-sm font-bold text-white">ขอรถสำหรับหน่วยงาน</h2>
            <p className="text-[10px] text-gray-400">ระบบจองรถ UP Smart Transit</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        {/* Success */}
        {step === 'success' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">ส่งคำขอจองรถเรียบร้อยแล้ว</p>
            {assignedBuses.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-4 py-3 text-xs text-gray-300">
                <p className="text-gray-400 mb-1">รถที่ระบบจัดสรรให้</p>
                <p className="font-bold text-white text-sm">{assignedBuses.join(', ')}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">Admin จะตรวจสอบและแจ้งผลให้ทราบ</p>
            <button onClick={onClose}
              className="mt-2 px-6 py-2 text-xs font-bold rounded-lg bg-brand-purple text-white hover:bg-brand-purple-dark transition-colors">
              ปิด
            </button>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">

            {/* Availability badge */}
            {availability && (
              <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                availability.remaining === 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : availability.remaining === 1
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : 'bg-green-500/20 text-green-400 border border-green-500/40'
              }`}>
                {availability.remaining === 0
                  ? `⚠️ วันที่นี้จองรถเต็มแล้ว (${availability.max}/${availability.max} คัน)`
                  : `✅ วันที่นี้จองได้อีก ${availability.remaining} คัน (จาก ${availability.max} คัน)`}
              </div>
            )}

            {/* หน่วยงาน */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">หน่วยงาน <span className="text-red-400">*</span></label>
              <select required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className={inputCls}>
                <option value="">-- เลือกหน่วยงาน --</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* วันที่ + จำนวนรถ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">วันที่ขอรถ <span className="text-red-400">*</span></label>
                <input type="date" required min={today}
                  value={form.reserved_date} onChange={e => setForm(f => ({ ...f, reserved_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  จำนวนรถ <span className="text-red-400">*</span>
                  <span className="text-gray-500 ml-1">(สูงสุด {maxBus} คัน)</span>
                </label>
                <input
                  type="number" required min={1} max={maxBus}
                  value={form.bus_count}
                  onChange={e => setForm(f => ({ ...f, bus_count: String(Math.min(maxBus, Math.max(1, parseInt(e.target.value) || 1))) }))}
                  disabled={availability?.remaining === 0}
                  className={inputCls}
                />
              </div>
            </div>

            {/* ช่วงเวลา */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">ช่วงเวลาที่ขอรถ <span className="text-red-400">*</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
                    className="accent-brand-purple w-3.5 h-3.5" />
                  <span className="text-xs text-gray-300">ทั้งวัน</span>
                </label>
              </div>
              {!allDay ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">เวลาเริ่ม</label>
                    <input type="time" required={!allDay} value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">เวลาเลิก</label>
                    <input type="time" required={!allDay} value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-xs text-gray-400">
                  ตลอดทั้งวัน
                </div>
              )}
            </div>

            {/* ผู้ประสานงาน */}
            <div>
              <p className="text-xs text-gray-500 mb-2 border-b border-[#2a2a4a] pb-1">ข้อมูลผู้ประสานงาน</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ชื่อผู้ประสานงาน</label>
                  <input type="text" placeholder="ชื่อ-นามสกุล"
                    value={form.coordinator_name} onChange={e => setForm(f => ({ ...f, coordinator_name: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">เบอร์โทรผู้ประสานงาน</label>
                  <input type="tel" placeholder="0XX-XXX-XXXX"
                    value={form.coordinator_phone} onChange={e => setForm(f => ({ ...f, coordinator_phone: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
            </div>

            {/* วัตถุประสงค์ */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">วัตถุประสงค์ / หมายเหตุ</label>
              <textarea rows={2} placeholder="เช่น รับแขกผู้บริหาร, นำนิสิตไปกิจกรรม..."
                value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className={`${inputCls} resize-none`} />
            </div>

            {/* เอกสารผ่าน DMS */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">เอกสารบันทึกขอรถ</label>
              <a href="https://dms.up.ac.th" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full px-4 py-3 rounded-lg text-xs font-medium text-white border border-brand-purple hover:bg-brand-purple/20 transition-colors"
                style={{ background: `${COLORS.purple}25` }}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                แนบผ่าน DMS (dms.up.ac.th)
              </a>
              <p className="text-[11px] text-red-400 mt-1.5">
                * หลังจากแนบเอกสารผ่าน DMS เรียบร้อยแล้วให้กลับมาคลิกปุ่ม ส่งคำขอรถ
              </p>
            </div>

            {errMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{errMsg}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 text-xs font-medium rounded-lg border border-[#2a2a4a] text-gray-400 hover:text-white hover:border-[#4a4a6a] transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={loading || availability?.remaining === 0}
                className="flex-1 py-2 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: COLORS.purple }}>
                {loading ? 'กำลังส่ง...' : 'ส่งคำขอจองรถ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
