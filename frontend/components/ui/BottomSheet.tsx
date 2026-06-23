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
      const raf = requestAnimationFrame(() => {
        setSnap(defaultSnap);
        currentSnap.current = defaultSnap;
      });
      return () => cancelAnimationFrame(raf);
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
            const next = currentSnap.current === 'peek' ? 'expanded' : 'peek';
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
