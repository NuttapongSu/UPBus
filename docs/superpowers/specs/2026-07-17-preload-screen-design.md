# Mobile Preload Screen — Design Spec
**Date:** 2026-07-17

## Purpose

Right now `app/_layout.tsx` gates only on font loading, then mounts `(tabs)` immediately. The map tab (`index.tsx`) starts empty (no polylines, no bus markers) until its own `useEffect` parses local KML and its `useSWR('/api/buses', getBuses)` hook resolves — the user briefly sees a blank satellite map.

Add a branded preload screen, shown after the native splash / font-load gate and before `(tabs)` mounts, that:
1. Hides the empty-map state until routes + buses are ready.
2. Shows the UP-CESM mascot ("น้องคาร์บอน") with a welcome message.
3. Guarantees a minimum 3-second display so the welcome message is legible even on fast connections.

This is purely a mobile client change — no backend or API changes.

---

## Sequence

```
Native splash (system)
  → font load gate (existing, app/_layout.tsx)
  → PreloadScreen (new)
      Promise.all([
        minDelay(3000),                         // always at least 3s
        Promise.race([                          // data load, capped
          loadRouteAndBusData(),
          timeout(10000),
        ]),
      ])
  → (tabs) mounts
```

- `loadRouteAndBusData()` = parse bundled KML (routes + stops, synchronous/instant) then `getBuses()` once.
- Progress bar has 2 discrete steps: KML parsed → 30%, buses fetched (or timeout reached) → 100%.
- The 3-second minimum and the 10-second data timeout are independent: minimum applies even if data loads in 200ms; timeout applies even if 3s has already elapsed (worst case ~10s screen, not 13s).

## Data hand-off (avoid duplicate fetch)

`index.tsx` already calls `useSWR('/api/buses', getBuses, { refreshInterval: ... })`. If `PreloadScreen`'s own `getBuses()` call succeeds, prime the SWR cache before mounting `(tabs)`:

```ts
import { mutate } from 'swr';
mutate('/api/buses', data, false); // false = don't revalidate immediately
```

`index.tsx`'s `useSWR` call then reads this cached value on mount instead of firing a second network request. If the preload fetch times out instead, the cache stays empty and `index.tsx`'s own `useSWR` fetches normally after mount (map just starts genuinely empty for a moment, same as current behavior).

## Slow-load notice

If the 10s timeout fires before `getBuses()` resolves:
- Proceed into `(tabs)` anyway (never block indefinitely).
- Set a one-shot flag surfaced via a small `SlowLoadContext` (React Context, boolean, default `false`) that wraps `<Stack>` in `_layout.tsx`.
- `index.tsx` reads the context once on mount; if `true`, shows a small dismissible banner for ~4s: "โหลดข้อมูลรถช้ากว่าปกติ กำลังลองใหม่..." — no retry button needed, existing SWR `refreshInterval` polling will pick up data once available.

## UI Layout

```
┌─────────────────────────────┐
│                               │
│      ╭─────────────────╮     │
│      │ ยินดีต้อนรับสู่      │     │ ← speech bubble, tail pointing
│      │ UP SMART TRANSIT │     │    down toward mascot's head
│      │ BY UP-CESM       │     │
│      ╰────────╲─────────╯     │
│                ╲               │
│         [น้องคาร์บอน]         │ ← assets/images/nongcabon.png
│                               │
│      [████████░░░░░░░░]      │ ← progress bar, 2 steps (30/100%)
│      กำลังโหลดข้อมูลรถ...     │ ← small status text below bar
│                               │
└─────────────────────────────┘
```

- Full-screen `View`, dark background (matches `userInterfaceStyle: dark`, reuse existing dark palette e.g. `#0a0a14`).
- Mascot image centered, reasonable fixed size (e.g. 180×180, `resizeMode: contain`).
- Speech bubble: rounded rect with small triangle tail, white/light background, dark text, positioned above mascot.
- Progress bar: below mascot, animated width transition between the two steps (`Animated.timing` or simple `View` width %).
- Status text under the bar updates: "กำลังโหลดเส้นทาง..." (step 1) → "กำลังโหลดข้อมูลรถ..." (step 2).

## Files Changed / Added

| File | Change |
|---|---|
| `upbus-mobile/assets/images/nongcabon.png` | New asset (copied from `cabon/nongcabon.png` at repo root) |
| `upbus-mobile/components/PreloadScreen.tsx` | New — owns the 2-step load sequence, 3s minimum, 10s timeout, progress bar UI, mascot + speech bubble |
| `upbus-mobile/lib/slowLoadContext.tsx` | New — tiny `SlowLoadContext` (React Context, boolean) |
| `upbus-mobile/app/_layout.tsx` | Add `appReady` state; render `<PreloadScreen onReady={...} />` instead of `<Stack>` until ready; wrap `<Stack>` in `SlowLoadContext.Provider` |
| `upbus-mobile/app/(tabs)/index.tsx` | On mount, read `SlowLoadContext`; if `true`, show temporary banner (~4s) |

No backend changes. No changes to `lib/api.ts` beyond what's already shipped (uses existing `getBuses`).

## Out of Scope

- No retry button / manual reload UI on the slow-load banner (SWR polling handles recovery).
- No persistence of "already saw welcome screen" — preload runs on every cold app launch, same as native splash does today.
- No changes to Android-specific marker behavior — this is an app-launch-time screen, unrelated to `BusMarker.android.tsx`.
