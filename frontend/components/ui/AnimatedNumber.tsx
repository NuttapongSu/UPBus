'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

const CSS = `
  @keyframes ani-out-up   { to   { transform: translateY(-110%); opacity: 0; } }
  @keyframes ani-in-up    { from { transform: translateY(110%);  opacity: 0; } }
  @keyframes ani-out-down { to   { transform: translateY(110%);  opacity: 0; } }
  @keyframes ani-in-down  { from { transform: translateY(-110%); opacity: 0; } }
`;

export default function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className = '',
}: Props) {
  const [shown, setShown] = useState(value);
  const [next, setNext] = useState<number | null>(null);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    setDir(value > prev.current ? 'up' : 'down');
    setNext(value);
    prev.current = value;
  }, [value]);

  const outAnim = dir === 'up' ? 'ani-out-up 0.45s ease forwards' : 'ani-out-down 0.45s ease forwards';
  const inAnim  = dir === 'up' ? 'ani-in-up 0.45s ease forwards'  : 'ani-in-down 0.45s ease forwards';

  return (
    <>
      <style>{CSS}</style>
      <span
        className={`inline-block overflow-hidden relative align-bottom ${className}`}
      >
        {dir && next !== null ? (
          <>
            {/* spacer: keeps container size during animation */}
            <span style={{ visibility: 'hidden', display: 'block' }}>{format(shown)}</span>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', animation: outAnim }}>
              {format(shown)}
            </span>
            <span
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', animation: inAnim }}
              onAnimationEnd={() => { setShown(next); setNext(null); setDir(null); }}
            >
              {format(next)}
            </span>
          </>
        ) : (
          <span style={{ display: 'block' }}>{format(shown)}</span>
        )}
      </span>
    </>
  );
}
