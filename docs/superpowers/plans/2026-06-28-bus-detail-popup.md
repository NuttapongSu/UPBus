# Bus Detail Popup & Follow Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a bus marker → bottom sheet slides up with live bus data; map follows the bus until user presses ✕.

**Architecture:** Three focused changes — new `BusDetailSheet` component handles all UI/animation, `BusMarker` gains `isSelected` highlight, `index.tsx` owns state + follow interval using a ref to avoid re-running every animation frame.

**Tech Stack:** React Native `Animated` API (no new deps), `react-native-maps` `animateCamera`, TypeScript.

## Global Constraints

- No new npm dependencies — use only React Native built-ins already in the project.
- Target: `upbus-mobile/` only — do not touch web frontend.
- Thai text must match exactly: หมายเลขรถ, คนขับ, สาย, ความเร็ว, SOC, สถานะ, อัปเดต.
- Dark background `rgba(15,15,26,0.95)`, top border-radius 16px, sheet height ~180px.
- Follow interval: 200ms, `animateCamera` duration 150ms.
- `animatedBuses` map re-creates every 16ms — never put it in a `useEffect` dependency array; read it via a `useRef` inside the interval instead.

---

### Task 1: BusDetailSheet component

**Files:**
- Create: `upbus-mobile/components/BusDetailSheet.tsx`

**Interfaces:**
- Consumes: `BusData` from `../../lib/api`
- Produces: `export default function BusDetailSheet({ bus, onClose }: { bus: BusData | null; onClose: () => void })`

- [ ] **Step 1: Create the file with full implementation**

```tsx
import { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BusData } from '../lib/api';

const LINE_LABELS: Record<string, string> = {
  Green: 'หน้ามอ',
  Blue:  'ประตู3',
  Red:   'หอพัก',
  Purple: '-',
};
const LINE_COLORS: Record<string, string> = {
  Green:  '#2ecc71',
  Blue:   '#3498db',
  Red:    '#e74c3c',
  Purple: '#9b59b6',
};

function parseDateThai(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const ms = new Date(dateStr.replace(' ', 'T') + '+07:00').getTime();
    if (isNaN(ms)) return '-';
    return new Date(ms).toLocaleTimeString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
}

export default function BusDetailSheet({ bus, onClose }: { bus: BusData | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (bus) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideY, { toValue: 300, duration: 180, useNativeDriver: true }).start();
    }
  }, [bus, slideY]);

  if (!bus && slideY._value === 300) return null;

  const busNum  = bus ? String(parseInt(bus.imei_id.replace('TC', ''), 10)) : '';
  const label   = bus ? (LINE_LABELS[bus.color] ?? bus.color) : '';
  const dot     = bus ? (LINE_COLORS[bus.color] ?? '#9b59b6') : '#9b59b6';
  const accText = bus?.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
  const time    = bus ? parseDateThai(bus.date) : '-';

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 12 }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.busNum}>รถ TC{busNum}</Text>
        <Text style={styles.lineLabel}>สาย: {label}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Detail rows */}
      <Text style={styles.row}>คนขับ: {bus?.driver || '-'}</Text>
      <View style={styles.rowGroup}>
        <Text style={styles.row}>ความเร็ว: {bus?.speed ?? 0} km/h</Text>
        <Text style={[styles.row, { marginLeft: 20 }]}>SOC: {bus?.soc ?? '-'}%</Text>
      </View>
      <Text style={styles.row}>สถานะ: {accText}</Text>
      <Text style={styles.row}>อัปเดต: {time}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,15,26,0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  busNum: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  lineLabel: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#aaa',
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    color: '#ddd',
    fontSize: 13,
    marginBottom: 5,
  },
  rowGroup: {
    flexDirection: 'row',
  },
});
```

- [ ] **Step 2: Verify the file was created**

```bash
ls upbus-mobile/components/BusDetailSheet.tsx
```
Expected: file exists, no error.

- [ ] **Step 3: Commit**

```bash
git add upbus-mobile/components/BusDetailSheet.tsx
git commit -m "feat(mobile): BusDetailSheet slide-up bottom panel"
```

---

### Task 2: BusMarker — add isSelected highlight

**Files:**
- Modify: `upbus-mobile/components/BusMarker.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `BusMarker({ busId, lat, lng, color, bearing?, onPress?, isSelected? })` — `isSelected` adds a white ring around the marker

- [ ] **Step 1: Update BusMarker to accept and render `isSelected`**

Replace the entire file content:

```tsx
import { Image, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

const BUS_IMAGES: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base.png'),
  Red:    require('../assets/images/bus-red-base.png'),
  Blue:   require('../assets/images/bus-blue-base.png'),
  Purple: require('../assets/images/bus-purple-base-2.png'),
};

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  bearing?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export default function BusMarker({ busId, lat, lng, color, bearing = 0, isSelected = false, onPress }: Props) {
  const imageSource = BUS_IMAGES[color] ?? BUS_IMAGES['Purple'];
  const busNum = String(parseInt(busId.replace('TC', ''), 10));
  const flipX = bearing >= 0 && bearing <= 180 ? -1 : 1;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={isSelected}
      identifier={busId}
    >
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: isSelected ? 2.5 : 0,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image
          source={imageSource}
          style={{ width: 52, height: 52, transform: [{ scaleX: flipX }] }}
          resizeMode="contain"
        />
        <Text style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: '900',
        }}>
          {busNum}
        </Text>
      </View>
    </Marker>
  );
}
```

Note: `tracksViewChanges={isSelected}` — only the selected bus re-renders its native view, keeping performance good for all other markers.

- [ ] **Step 2: Commit**

```bash
git add upbus-mobile/components/BusMarker.tsx
git commit -m "feat(mobile): BusMarker isSelected ring highlight"
```

---

### Task 3: Wire up index.tsx — state, follow, auto-close, render sheet

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes:
  - `BusDetailSheet` from `../../components/BusDetailSheet` (default export)
  - `BusMarker` already imported — now pass `onPress` and `isSelected`
  - `animatedBuses: Map<string, AnimBus>` from `useAnimatedBuses`
- Produces: nothing new — wires existing pieces together

- [ ] **Step 1: Add import for BusDetailSheet**

At the top of the file, after the existing `BusMarker` import (line 9), add:

```ts
import BusDetailSheet from '../../components/BusDetailSheet';
```

- [ ] **Step 2: Add selectedBusId state and animatedBusesRef**

After the `locationGranted` state declaration (around line 111), add:

```ts
const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
const animatedBusesRef = useRef(animatedBuses);
useEffect(() => { animatedBusesRef.current = animatedBuses; }, [animatedBuses]);
```

The ref lets the follow interval always read the latest positions without re-creating the interval.

- [ ] **Step 3: Add follow interval useEffect**

After the `animatedBuses` declaration (around line 155), add:

```ts
// Follow selected bus — read position via ref to avoid re-creating interval every frame
useEffect(() => {
  if (!selectedBusId) return;
  const id = setInterval(() => {
    const anim = animatedBusesRef.current.get(selectedBusId);
    if (!anim) return;
    mapRef.current?.animateCamera(
      { center: { latitude: anim.lat, longitude: anim.lng } },
      { duration: 150 },
    );
  }, 200);
  return () => clearInterval(id);
}, [selectedBusId]);

// Auto-close sheet when selected bus leaves displayedBuses (API gone or filter changed)
useEffect(() => {
  if (!selectedBusId) return;
  if (!displayedBuses.find(b => b.imei_id === selectedBusId)) {
    setSelectedBusId(null);
  }
}, [displayedBuses, selectedBusId]);
```

- [ ] **Step 4: Pass onPress and isSelected to BusMarker**

Find the BusMarker render block (the `displayedBuses.map` section) and update it:

```tsx
{displayedBuses.map(bus => {
  const anim = animatedBuses.get(bus.imei_id)!;
  return (
    <BusMarker
      key={bus.imei_id}
      busId={bus.imei_id}
      lat={anim.lat}
      lng={anim.lng}
      color={bus.color}
      bearing={anim.bearing}
      isSelected={bus.imei_id === selectedBusId}
      onPress={() => setSelectedBusId(bus.imei_id)}
    />
  );
})}
```

- [ ] **Step 5: Derive selectedBus and render BusDetailSheet**

After the closing `</MapView>` tag (before the line filter chips `<View>`), add:

```tsx
{/* Bus detail bottom sheet */}
<BusDetailSheet
  bus={buses.find(b => b.imei_id === selectedBusId) ?? null}
  onClose={() => setSelectedBusId(null)}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd upbus-mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If errors appear fix them before committing.

- [ ] **Step 7: Commit**

```bash
git add upbus-mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): bus tap → bottom sheet + map follow"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|---|---|
| Tap bus → bottom sheet slides up | Task 1 (sheet animation) + Task 3 Step 4 (onPress) |
| Shows หมายเลขรถ, สาย, คนขับ, ความเร็ว, SOC, สถานะ ACC, เวลา | Task 1 |
| ✕ button closes + stops follow | Task 1 (onClose prop) + Task 3 Step 5 |
| Map follows selected bus (200ms, animateCamera 150ms) | Task 3 Step 3 |
| Bus disappears → auto-close | Task 3 Step 3 (auto-close useEffect) |
| Line filter change closes sheet | Task 3 Step 3 (auto-close via displayedBuses) |
| isSelected ring on marker | Task 2 |
| `animatedBuses` never in useEffect deps | Task 3 Step 2 (ref pattern) |
| driver empty → '-' | Task 1 (`bus?.driver \|\| '-'`) |
| date parse fail → '-' | Task 1 (`parseDateThai` try/catch) |
| No new dependencies | All tasks use built-ins only ✅ |
