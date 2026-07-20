# Mobile UI Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill three visual gaps between the current mobile code and the target screenshot design: map header bar, filter chips repositioned to bottom, and complaints sub-category checkboxes.

**Architecture:** Pure UI changes to two existing screen files. No new files, no API changes, no new dependencies. Each task is independently releasable.

**Tech Stack:** Expo ~56.0.12, React Native 0.85.3, TypeScript, expo-router (tabs), `react-native-safe-area-context` (already installed)

## Global Constraints

- No new npm packages
- Dark theme: background `#0f0f1a` / card `#1a1a2e` / border `#2a2a4a`, accent purple `#a78bfa` / `#7c3aed`
- Thai Buddhist year: Gregorian year + 543
- All UI tested manually via Expo Go on device/simulator — no UI test framework exists in this project

---

### Task 1: Map Screen — Header Bar + Chips Moved to Bottom

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `buses` array from existing `useSWR` hook (already in scope), `useSafeAreaInsets` (already imported)
- Produces: nothing new for other tasks

- [ ] **Step 1: Add live-clock state and Thai Buddhist date helper inside `MapScreen`**

Locate the existing state declarations near line 143 in `index.tsx`. Add directly after the `selectedBusId` state:

```tsx
const [now, setNow] = useState(new Date());

useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(id);
}, []);

function formatThaiDate(d: Date): string {
  const buddhistYear = d.getFullYear() + 543;
  const month = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()];
  return `${d.getDate()} ${month} ${String(buddhistYear).slice(2)}`;
}

function formatTime(d: Date): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}
```

- [ ] **Step 2: Replace `<View style={styles.container}>` opening with header + map layout**

Find the `return (` block (around line 296). Replace the outer `<View style={styles.container}>` and `<MapView ...>` opening so the structure becomes:

```tsx
return (
  <View style={styles.container}>
    {/* ─── Header bar ─────────────────────────────────── */}
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <View style={styles.headerCell}>
        <Text style={styles.headerLabel}>วันที่</Text>
        <Text style={styles.headerValue}>{formatThaiDate(now)}</Text>
      </View>
      <View style={[styles.headerCell, styles.headerCellCenter]}>
        <Text style={styles.headerLabel}>เวลา</Text>
        <Text style={styles.headerValue}>{formatTime(now)}</Text>
      </View>
      <View style={[styles.headerCell, styles.headerCellRight]}>
        <Text style={styles.headerLabel}>รถวิ่ง</Text>
        <Text style={styles.headerValue}>{buses.length} คัน</Text>
      </View>
    </View>

    <MapView
      ref={mapRef}
      style={styles.map}
      mapType="satellite"
      initialRegion={UP_CAMPUS_REGION}
      showsUserLocation={locationGranted}
      showsMyLocationButton={false}
    >
```

- [ ] **Step 3: Move chips to bottom — update the chips `<View>` block**

Find the existing chips block (currently `{ top: insets.top + 8, left: 8 }`). Replace the entire chips `<View>` with:

```tsx
{/* Line filter chips — bottom */}
<View style={[styles.chips, { bottom: insets.bottom + 12 }]}>
  {LINE_CONFIG.map(l => {
    const isActive = lineFilter === l.key;
    return (
      <TouchableOpacity
        key={String(l.key)}
        style={[
          styles.chip,
          { borderColor: l.color },
          isActive && { backgroundColor: l.color },
        ]}
        onPress={() => handleChipPress(l.key)}
      >
        <Text style={[styles.chipText, { color: isActive ? '#0f0f1a' : l.color }]}>
          {l.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

- [ ] **Step 4: Update StyleSheet**

Replace the existing `chips` style and add new header styles to `StyleSheet.create({...})`:

```tsx
// replace existing `chips` style:
chips: {
  position: 'absolute',
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 8,
  paddingHorizontal: 12,
},
// keep `chip` and `chipText` as-is

// add new header styles:
header: {
  flexDirection: 'row',
  backgroundColor: '#0a0a14',
  borderBottomWidth: 1,
  borderBottomColor: '#1e1e3a',
  paddingHorizontal: 16,
  paddingBottom: 8,
},
headerCell: {
  flex: 1,
  alignItems: 'flex-start',
},
headerCellCenter: {
  alignItems: 'center',
},
headerCellRight: {
  alignItems: 'flex-end',
},
headerLabel: {
  color: '#a78bfa',
  fontSize: 9,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
headerValue: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
  marginTop: 1,
},
```

- [ ] **Step 5: Verify in Expo Go**

Run: `cd upbus-mobile && npx expo start`

Check:
1. Header bar appears at top with วันที่ / เวลา / รถวิ่ง — clock ticks every second
2. Filter chips appear at bottom of map above tab bar
3. Tapping chips still filters buses and polylines correctly
4. Map fills space between header and chips with no overlap

- [ ] **Step 6: Commit**

```bash
git add "upbus-mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): add map header bar and move filter chips to bottom"
```

---

### Task 2: Complaints Screen — Sub-Category Checkboxes

**Files:**
- Modify: `upbus-mobile/app/(tabs)/complaints.tsx`

**Interfaces:**
- Consumes: existing `type` state (string), existing `detail` state (string), existing `setDetail`
- Produces: nothing new for other tasks

- [ ] **Step 1: Add sub-category data map and state**

At the top of `complaints.tsx`, after the `LINES` constant, add:

```tsx
const SUBCATS: Record<string, string[]> = {
  'driver-service': ['พูดจาไม่สุภาพ', 'ขับรถเร็วเกินไป', 'ไม่หยุดรับผู้โดยสาร', 'ไม่รอผู้โดยสาร', 'อื่น ๆ'],
  'bus-condition':  ['รถสกปรก', 'แอร์ไม่เย็น', 'ที่นั่งชำรุด', 'เสียงดังผิดปกติ', 'อื่น ๆ'],
  'system-wrong':  ['แสดงตำแหน่งผิด', 'แอปค้าง/หยุดทำงาน', 'ข้อมูลไม่อัปเดต', 'แจ้งเตือนไม่ทำงาน', 'อื่น ๆ'],
  'other':         ['ความปลอดภัย', 'เวลาให้บริการ', 'จุดจอดรถ', 'อื่น ๆ'],
};
```

Inside `ComplaintsScreen`, add state after the existing state declarations:

```tsx
const [selectedSubcats, setSelectedSubcats] = useState<string[]>([]);
```

- [ ] **Step 2: Reset sub-categories when type changes**

Replace the existing `setType(t.key)` call in the type card `onPress` with:

```tsx
onPress={() => { setType(t.key); setSelectedSubcats([]); }}
```

- [ ] **Step 3: Add toggle helper and sub-category panel JSX**

Add a helper inside `ComplaintsScreen` (before `return`):

```tsx
function toggleSubcat(label: string) {
  setSelectedSubcats(prev =>
    prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
  );
}
```

In the JSX, after the closing `</View>` of `typeGrid`, add the expansion panel:

```tsx
{/* Sub-category expansion */}
<View style={styles.subcatPanel}>
  <Text style={styles.subcatHeader}>
    {TYPES.find(t => t.key === type)?.icon}{' '}
    {TYPES.find(t => t.key === type)?.label} — เลือกรายละเอียด
  </Text>
  {SUBCATS[type].map(label => {
    const checked = selectedSubcats.includes(label);
    return (
      <TouchableOpacity
        key={label}
        style={styles.subcatRow}
        onPress={() => toggleSubcat(label)}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
        </View>
        <Text style={[styles.subcatLabel, checked && { color: '#fff' }]}>{label}</Text>
      </TouchableOpacity>
    );
  })}
</View>
```

- [ ] **Step 4: Prepend selected sub-categories into detail on submit**

In `handleSubmit`, replace:

```tsx
form.append('detail', detail);
```

with:

```tsx
const prefix = selectedSubcats.length > 0 ? selectedSubcats.join(', ') + (detail.trim() ? ' — ' : '') : '';
form.append('detail', prefix + detail);
```

Also update the validation check so it accepts having sub-cats even with empty free text:

```tsx
if (!detail.trim() && selectedSubcats.length === 0) {
  Alert.alert('กรุณาระบุรายละเอียดหรือเลือกประเภทปัญหา');
  return;
}
```

- [ ] **Step 5: Reset sub-categories on successful submit**

After `setDetail(''); setPhoto(null);` in the success branch, add:

```tsx
setSelectedSubcats([]);
```

- [ ] **Step 6: Add StyleSheet entries**

Append to the existing `StyleSheet.create({...})`:

```tsx
subcatPanel: {
  backgroundColor: '#1a1a2e',
  borderWidth: 1,
  borderColor: '#2a2a4a',
  borderRadius: 10,
  padding: 10,
  gap: 6,
},
subcatHeader: {
  color: '#a78bfa',
  fontSize: 11,
  fontWeight: '700',
  marginBottom: 4,
},
subcatRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 6,
},
checkbox: {
  width: 18,
  height: 18,
  borderWidth: 1.5,
  borderColor: '#3a3a5e',
  borderRadius: 4,
  alignItems: 'center',
  justifyContent: 'center',
},
checkboxChecked: {
  backgroundColor: '#7c3aed',
  borderColor: '#7c3aed',
},
subcatLabel: {
  color: '#888',
  fontSize: 12,
},
```

- [ ] **Step 7: Update placeholder text to match screenshot**

Find the `TextInput` placeholder:
```tsx
placeholder="พิมพ์รายละเอียด..."
```
Change to:
```tsx
placeholder="พิมพ์รายละเอียดเพิ่มเติม..."
```

- [ ] **Step 8: Verify in Expo Go**

Check:
1. Tapping คนขับ shows its 5 sub-category checkboxes
2. Switching to สภาพรถ clears selected checkboxes and shows correct options
3. Checking multiple options highlights them (purple fill)
4. Submitting with only checkboxes (no free text) succeeds
5. Submitting with both checkboxes + free text → detail field combines them as `"ขับรถเร็วเกินไป — my note"`
6. After successful submit, checkboxes and form reset

- [ ] **Step 9: Commit**

```bash
git add "upbus-mobile/app/(tabs)/complaints.tsx"
git commit -m "feat(mobile): add sub-category checkboxes to complaints form"
```
