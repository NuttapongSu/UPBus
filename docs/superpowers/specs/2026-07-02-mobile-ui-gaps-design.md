# Mobile UI Gaps — Design Spec
**Date:** 2026-07-02

## Scope

Three UI gaps between the current mobile code and the target screenshots. No new screens, no backend changes.

---

## 1. Map Screen — Header Bar

**What:** Fixed dark bar between the system status bar and the map, spanning full width.

**Content (3 columns):**
| Column | Label | Value |
|---|---|---|
| Left | วันที่ | Thai Buddhist date (e.g. 29 มิ.ย. 69) |
| Center | เวลา | HH:MM:SS live clock (updated every second via `setInterval`) |
| Right | รถวิ่ง | `N คัน` where N = `buses.length` from existing SWR poll |

**Style:** `backgroundColor: '#0a0a14'`, border-bottom `#1e1e3a`, text labels in purple `#a78bfa`, values in white, padded to safe area top via `useSafeAreaInsets`.

**Implementation note:** Header sits inside the existing `<View style={styles.container}>` above `<MapView>`, not overlaid on map. MapView shrinks to remaining height.

---

## 2. Map Screen — Filter Chips Move to Bottom

**What:** The 4 line-filter chips (ทุกสาย / หน้ามอ / ประตู3 / หอพัก) move from `position: absolute, top` to `position: absolute, bottom` above the tab bar.

**Current:** `{ position: 'absolute', top: insets.top + 8, left: 8 }`  
**Target:** `{ position: 'absolute', bottom: insets.bottom + 10, left: 0, right: 0 }` — centered row, horizontal scroll if needed.

**Style:** chips keep existing border/color style; row has `justifyContent: 'center'`, slight dark overlay background pill behind the row for legibility over the satellite map.

---

## 3. Complaints Screen — Sub-Category Checkboxes

**What:** After tapping a type card (คนขับ / สภาพรถ / ระบบแอป / อื่น ๆ), an expansion panel appears inline below the type grid with multi-select checkboxes.

**Sub-category options per type:**

| Type key | Options |
|---|---|
| `driver-service` | พูดจาไม่สุภาพ, ขับรถเร็วเกินไป, ไม่หยุดรับผู้โดยสาร, ไม่รอผู้โดยสาร, อื่น ๆ |
| `bus-condition` | รถสกปรก, แอร์ไม่เย็น, ที่นั่งชำรุด, เสียงดังผิดปกติ, อื่น ๆ |
| `system-wrong` | แสดงตำแหน่งผิด, แอปค้าง/หยุดทำงาน, ข้อมูลไม่อัปเดต, แจ้งเตือนไม่ทำงาน, อื่น ๆ |
| `other` | ความปลอดภัย, เวลาให้บริการ, จุดจอดรถ, อื่น ๆ |

**State:** `selectedSubcats: string[]` — resets to `[]` whenever `type` changes.

**Submit behavior:** Selected sub-category labels are prepended to the `detail` field as a comma-separated prefix before posting, e.g. `"ขับรถเร็วเกินไป, ไม่รอผู้โดยสาร — [user detail]"`. If no subcats selected, detail is sent as-is.

**Style:** Expansion panel has same dark card style as type cards, header shows `[icon] [TypeLabel] — เลือกรายละเอียด` in purple, each row is a touchable checkbox row (square border → filled on select).

---

## Files Changed

| File | Change |
|---|---|
| `upbus-mobile/app/(tabs)/index.tsx` | Add header bar component + move chips to bottom |
| `upbus-mobile/app/(tabs)/complaints.tsx` | Add sub-category state + expansion panel UI |

No new files required.
