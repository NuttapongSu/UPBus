# Responsive Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the passenger-facing Next.js dashboard responsive across mobile (< 768px), tablet (768–1023px), and desktop (1024px+) without changing backend, admin pages, or PHP files.

**Architecture:** Add a reusable `BottomSheet` component with drag-to-snap behavior; restructure `page.tsx` with CSS breakpoints so left/right sidebars are hidden below their breakpoints and replaced by BottomSheets; fix `BusLineCards` for horizontal scrolling on mobile.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS 3, TypeScript 5 — no new dependencies.

## Global Constraints

- No new npm packages
- No changes to `backend/`, `frontend/app/admin/`, `*.php`, or `*.kml` files
- Tailwind breakpoints: `md:` = 768px, `lg:` = 1024px
- All components remain `'use client'`
- `npm run build` must pass with zero TypeScript errors after every task

---

### Task 1: BottomSheet component

**Files:**
- Create: `frontend/components/ui/BottomSheet.tsx`

**Interfaces:**
- Produces: `BottomSheet` default export consumed by `page.tsx`
  ```ts
  interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    defaultSnap?: 'peek' | 'expanded'; // default: 'expanded'
  }
  ```

- [ ] **Step 1: Create the file**

`frontend/components/ui/BottomSheet.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';

type Snap = 'hidden' | 'peek' | 'expanded';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  defaultSnap?: 'peek' | 'expanded';
}

const PEEK_PX = 80;

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  defaultSnap = 'expanded',
}: BottomSheetProps) {
  const [snap, setSnap] = useState<Snap>('hidden');
  const [mounted, setMounted] = useState(false);
  const startY = useRef(0);
  const currentSnap = useRef<Snap>('hidden');

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Defer to next frame so CSS transition fires
      requestAnimationFrame(() => {
        setSnap(defaultSnap);
        currentSnap.current = defaultSnap;
      });
    } else {
      setSnap('hidden');
      currentSnap.current = 'hidden';
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, defaultSnap]);

  if (!mounted) return null;

  const translateY =
    snap === 'hidden'
      ? '100%'
      : snap === 'peek'
      ? `calc(100% - ${PEEK_PX}px)`
      : '0%';

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - startY.current;
    if (delta > 60) {
      // dragged down
      if (currentSnap.current === 'expanded') {
        setSnap('peek');
        currentSnap.current = 'peek';
      } else {
        setSnap('hidden');
        currentSnap.current = 'hidden';
        onClose();
      }
    } else if (delta < -60) {
      // dragged up
      if (currentSnap.current === 'peek') {
        setSnap('expanded');
        currentSnap.current = 'expanded';
      }
    }
  }

  return (
    <>
      {/* Backdrop — only when expanded */}
      {snap === 'expanded' && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => { setSnap('hidden'); currentSnap.current = 'hidden'; onClose(); }}
        />
      )}

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-[#0f0f1a] border-t border-[#2a2a4a] transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${translateY})`, maxHeight: '65vh' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle + title */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab shrink-0"
          onClick={() => {
            const next = snap === 'peek' ? 'expanded' : 'peek';
            setSnap(next);
            currentSnap.current = next;
          }}
        >
          <div className="w-10 h-1 rounded-full bg-[#444]" />
          {title && (
            <p className="text-xs font-semibold text-gray-300 mt-2 tracking-wide">{title}</p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-3 pb-4 flex-1">
          {children}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npm run build
```
Expected: Build succeeds, zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/BottomSheet.tsx
git commit -m "feat: add BottomSheet component with drag-to-snap"
```

---

### Task 2: Responsive page.tsx layout

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `BottomSheet` from `@/components/ui/BottomSheet`
- Consumes all existing imports unchanged

- [ ] **Step 1: Replace the entire file content**

`frontend/app/page.tsx`:
```tsx
'use client';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';
import { getBuses, BusData } from '@/lib/api';
import SystemOverview from '@/components/Dashboard/SystemOverview';
import SustainabilityPanel from '@/components/Dashboard/SustainabilityPanel';
import BusLineCards from '@/components/Dashboard/BusLineCards';
import NearbyStops from '@/components/Dashboard/NearbyStops';
import BusApproachAlerts from '@/components/Dashboard/BusApproachAlerts';
import BusRequestModal from '@/components/Dashboard/BusRequestModal';
import LineDetailPanel from '@/components/Dashboard/LineDetailPanel';
import BusDetailPanel from '@/components/Dashboard/BusDetailPanel';
import BottomSheet from '@/components/ui/BottomSheet';

const BusMap = dynamic(() => import('@/components/Map/BusMap'), { ssr: false });

export default function HomePage() {
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, {
    refreshInterval: 10000,
  });

  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [busFilter, setBusFilter] = useState<'charging' | 'available' | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [sheet1Open, setSheet1Open] = useState(false);   // left panel sheet (mobile+tablet)
  const [sheet2Open, setSheet2Open] = useState(false);   // right panel sheet (mobile only)

  function handleBusFilter(filter: 'charging' | 'available') {
    setBusFilter(prev => {
      if (prev === filter) return null;
      setSelectedLine(null);
      return filter;
    });
  }

  // Auto-open right sheet when bus or line is selected (mobile)
  useEffect(() => {
    if (selectedBus || selectedLine) setSheet2Open(true);
    else setSheet2Open(false);
  }, [selectedBus, selectedLine]);

  function handleSheet2Close() {
    setSheet2Open(false);
    setSelectedBus(null);
    setSelectedLine(null);
  }

  const displayBuses = useMemo(() => {
    let result = buses;
    if (selectedLine) result = result.filter(b => b.color === selectedLine);
    if (busFilter === 'charging')  result = result.filter(b => b.acc === 0);
    if (busFilter === 'available') result = result.filter(b => b.color === 'Purple' && !b.department);
    return result;
  }, [buses, selectedLine, busFilter]);

  const [now, setNow] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  // Right panel content (shared between sidebar and sheet)
  const rightPanelContent = selectedBus ? (
    <BusDetailPanel busId={selectedBus} onBack={() => setSelectedBus(null)} />
  ) : selectedLine ? (
    <LineDetailPanel
      buses={buses}
      selectedLine={selectedLine}
      onClose={() => setSelectedLine(null)}
      onSelectBus={busId => setSelectedBus(busId)}
    />
  ) : (
    <SustainabilityPanel />
  );

  // Left panel content (shared between sidebar and sheet)
  const leftPanelContent = (
    <>
      <SystemOverview
        buses={buses}
        onSelectBus={busId => setSelectedBus(busId)}
        busFilter={busFilter}
        onFilterBuses={handleBusFilter}
      />
      <NearbyStops />
      <BusApproachAlerts buses={buses} />
    </>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e2e] shrink-0">
        <div className="shrink-0">
          <h1 className="text-base md:text-lg font-bold leading-tight">UP Smart Transit</h1>
          <p className="text-[10px] text-gray-400 hidden sm:block">ระบบขนส่งอัจฉริยะเพื่อมหาวิทยาลัยสีเขียว</p>
        </div>
        {/* Search — hidden on mobile */}
        <input
          className="hidden md:flex flex-1 mx-4 bg-[#1a1a2e] border border-[#2a2a4a] rounded-full px-4 py-2 text-sm outline-none"
          placeholder="ค้นหาเส้นทาง/ป้ายรถ/จุดหมาย..."
        />
        {/* Datetime — desktop only */}
        <p className="hidden lg:block text-sm text-gray-300 ml-auto shrink-0">อัปเดต {now}</p>
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] bg-[#9b59b6] text-white hover:bg-[#8e44ad] transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">ขอรถ</span>
          </button>
          <a
            href="https://bustransit.up.ac.th/admin/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] text-[#9b59b6] hover:bg-[#9b59b6] hover:text-white transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Admin</span>
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Sidebar — desktop only */}
        <aside className="hidden lg:flex w-64 flex-col gap-3 p-3 overflow-y-auto bg-[#0f0f1a] border-r border-[#1e1e2e] shrink-0">
          {leftPanelContent}
        </aside>

        {/* Map */}
        <main className="flex-1 relative h-full">
          <BusMap buses={displayBuses} selectedLine={selectedLine} selectedBus={selectedBus} />
        </main>

        {/* Right Sidebar — tablet+ */}
        <aside className="hidden md:flex w-72 flex-col p-3 overflow-y-auto bg-[#0f0f1a] border-l border-[#1e1e2e] shrink-0">
          {rightPanelContent}
        </aside>

        {/* FAB — open left sheet (mobile + tablet) */}
        <button
          onClick={() => setSheet1Open(true)}
          className="lg:hidden fixed bottom-28 left-4 z-30 w-12 h-12 rounded-full bg-[#1a1a2e] border border-[#2a2a4a] shadow-lg flex items-center justify-center text-white hover:bg-[#2a2a4a] transition-colors"
          aria-label="ภาพรวมระบบ"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Bottom Bar */}
      <BusLineCards buses={buses} selectedLine={selectedLine} onSelectLine={setSelectedLine} />

      {/* Bottom Sheet 1: left panel (mobile + tablet) */}
      <div className="lg:hidden">
        <BottomSheet
          isOpen={sheet1Open}
          onClose={() => setSheet1Open(false)}
          title="ภาพรวมระบบ"
        >
          <div className="flex flex-col gap-3">
            {leftPanelContent}
          </div>
        </BottomSheet>
      </div>

      {/* Bottom Sheet 2: right panel (mobile only) */}
      <div className="md:hidden">
        <BottomSheet
          isOpen={sheet2Open}
          onClose={handleSheet2Close}
          title={selectedBus ? 'รายละเอียดรถ' : selectedLine ? 'รายละเอียดสาย' : 'ความยั่งยืน'}
        >
          {rightPanelContent}
        </BottomSheet>
      </div>

      {/* Modal จองรถ */}
      {showRequest && <BusRequestModal onClose={() => setShowRequest(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npm run build
```
Expected: Zero TypeScript errors. Warnings about `img` vs `next/image` are acceptable.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: responsive layout — bottom sheets for mobile/tablet"
```

---

### Task 3: BusLineCards mobile scrolling

**Files:**
- Modify: `frontend/components/Dashboard/BusLineCards.tsx`

**Interfaces:**
- Props unchanged: `{ buses, selectedLine, onSelectLine }`

- [ ] **Step 1: Add horizontal scroll and shrink-0 to cards**

Change the outer `<div>` from:
```tsx
<div className="flex gap-3 px-4 py-3 items-stretch">
```
to:
```tsx
<div className="flex gap-3 px-4 py-3 items-stretch overflow-x-auto scrollbar-hide">
```

And change each line card `<button>` (the ones inside `LINES.map`) from:
```tsx
className="flex-1 rounded-xl p-4 border text-left transition-all"
```
to:
```tsx
className="flex-1 shrink-0 min-w-[160px] rounded-xl p-4 border text-left transition-all"
```

- [ ] **Step 2: Add scrollbar-hide utility to globals.css**

`frontend/app/globals.css` — append at the bottom:
```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```
Expected: Zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Dashboard/BusLineCards.tsx frontend/app/globals.css
git commit -m "feat: BusLineCards horizontal scroll on mobile"
```

---

## Visual Testing Checklist

After all tasks complete, run `npm run dev` and open DevTools → toggle device toolbar:

**Mobile (375px wide):**
- [ ] Map fills screen below header
- [ ] Header shows: logo + ขอรถ button (no search bar, no datetime)
- [ ] BusLineCards shows at bottom, scrollable horizontally
- [ ] FAB (≡) button visible at bottom-left above BusLineCards
- [ ] Tapping FAB opens Sheet 1 (ภาพรวมระบบ) — drag handle visible
- [ ] Dragging handle up/down snaps between peek/expanded
- [ ] Tapping backdrop closes sheet
- [ ] Selecting a bus/line on map auto-opens Sheet 2

**Tablet (768px wide):**
- [ ] Right sidebar (w-72) visible on right side
- [ ] Left sidebar hidden, FAB visible
- [ ] Sheet 2 does NOT appear (right panel is in sidebar)
- [ ] BusLineCards at bottom

**Desktop (1280px wide):**
- [ ] 3-column layout identical to before (left w-64, map flex-1, right w-72)
- [ ] No FAB button visible
- [ ] No bottom sheets
- [ ] Search bar and datetime visible in header
