# Bus Detail Popup & Follow Mode — Mobile

**Date:** 2026-06-28
**Scope:** `upbus-mobile` only — `app/(tabs)/index.tsx`, `components/BusMarker.tsx`, new `components/BusDetailSheet.tsx`

---

## Goal

When the user taps a bus marker on the map, a bottom sheet slides up showing the bus's live data (same fields as the web popup). The map locks onto that bus and follows it until the user presses ✕.

---

## Data Shown (matching web popup)

| Field | Source |
|---|---|
| หมายเลขรถ | `bus.imei_id` → strip "TC", show number |
| สาย | `bus.color` → label (Green = หน้ามอ, Blue = ประตู3, Red = หอพัก) |
| คนขับ | `bus.driver` |
| ความเร็ว | `bus.speed` km/h |
| SOC แบตเตอรี่ | `bus.soc` % |
| สถานะ ACC | `bus.acc` — 🟢 ทำงาน / 🔴 กำลังชาร์จ |
| อัปเดตล่าสุด | `bus.date` (Bangkok time, same parse as web) |

---

## Architecture

### New state in `index.tsx`

```ts
const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
```

### BusMarker change

Add `onPress={() => setSelectedBusId(bus.imei_id)}` to each `<BusMarker>`. Pass `isSelected` prop so the marker can visually highlight (ring or scale).

### BusDetailSheet component

New file: `upbus-mobile/components/BusDetailSheet.tsx`

- Receives: `bus: BusData | null`, `onClose: () => void`
- Renders nothing when `bus` is null
- Slides up via `Animated.spring` on `translateY` (hidden = +300, visible = 0)
- Positioned absolutely at the bottom, above safe area, full width
- Dark background (`rgba(15,15,26,0.95)`) with top rounded corners (16px)
- Colored line indicator dot matching `bus.color`
- ✕ button top-right → calls `onClose()`

### Follow mode — `useEffect` in `index.tsx`

```ts
useEffect(() => {
  if (!selectedBusId) return;
  const id = setInterval(() => {
    const anim = animatedBuses.get(selectedBusId);
    if (!anim) return;
    mapRef.current?.animateCamera(
      { center: { latitude: anim.lat, longitude: anim.lng } },
      { duration: 150 }
    );
  }, 200);
  return () => clearInterval(id);
}, [selectedBusId, animatedBuses]);
```

`animateCamera` with `duration: 150` gives smooth follow without resetting zoom or bearing.

### onClose

```ts
const handleCloseSheet = () => setSelectedBusId(null);
```

Clearing `selectedBusId` stops the interval (cleanup) and collapses the sheet.

---

## Visual Layout

```
┌─────────────────────────────────────┐
│  ● TC17  สาย: หน้ามอ          [✕]  │
│  คนขับ: สมชาย ใจดี                  │
│  ความเร็ว: 25 km/h   SOC: 87%       │
│  สถานะ: 🟢 ทำงาน                    │
│  อัปเดต: 10:56:23                   │
└─────────────────────────────────────┘
```

Sheet height: fixed ~180px (no snap points — content is fixed).

---

## Animation

- **Open:** `Animated.spring({ toValue: 0, useNativeDriver: true })` when `bus` changes from null → value
- **Close:** `Animated.timing({ toValue: 300, duration: 180 })` → then `onClose()`

---

## Edge Cases

- Bus disappears from API while selected → sheet closes automatically (selectedBus becomes undefined in displayedBuses)
- User taps same bus again → no-op (already selected)
- User switches line filter while bus is selected → if bus is filtered out, close sheet
- `bus.driver` is empty → show `'-'`
- `bus.date` parse fails → show `'-'`

---

## Files Changed

| File | Change |
|---|---|
| `app/(tabs)/index.tsx` | Add `selectedBusId` state, follow `useEffect`, pass `onPress` to BusMarker, render BusDetailSheet |
| `components/BusMarker.tsx` | Accept + forward `onPress`, add `isSelected` ring highlight |
| `components/BusDetailSheet.tsx` | New component |

No new dependencies required.
