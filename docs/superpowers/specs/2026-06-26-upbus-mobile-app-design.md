# UPBus Mobile App — Design Spec

**Date:** 2026-06-26  
**Branch:** feat/mobile-app  
**Framework:** React Native (Expo) — iOS + Android

---

## Overview

Mobile passenger app for UP Smart Transit (University of Phayao campus bus system). Targets students and general passengers. No login required — fully anonymous, push notifications tied to device token.

---

## Tab Structure

4 tabs, bottom tab bar:

| Tab | Icon | Screen |
|-----|------|--------|
| แผนที่ | 🗺️ | Realtime bus map |
| เส้นทาง | 🚏 | Destination selector + boarding info |
| สิ่งแวดล้อม | 🌱 | Sustainability stats |
| ร้องเรียน | 📝 | Complaint form + history |

---

## Tab 1: แผนที่ (Map)

- Full-screen Leaflet/MapLibre map showing realtime bus positions (polling `/api/buses` every 10s)
- Bus markers with line color + number (matches web)
- Bus stop markers for all stops on active routes
- Line filter chips at top: ทุกสาย / Green / Blue / Red
- **When destination is active:** highlight only lines that pass through destination; show ⭐ boarding stop marker; show 🎯 destination stop marker
- Bottom overlay bar showing ETA per passing line to the boarding stop (only when destination is selected)

---

## Tab 2: เส้นทาง (Route Planner)

### State A — No destination selected
- Search box: "ฉันต้องการไปที่..."
- Recent destinations (stored locally)
- List of all bus stops with their line dots

### State B — Destination selected → system calculates
For each bus line:
1. **Check if line passes through destination stop** → if not, show as disabled
2. **Find nearest boarding stop to user** on that line's route
3. **Show ETA** of next bus on that line to reach the boarding stop

UI shows per passing line:
- Line badge (Green/Red/Blue)
- Line name
- "ไปรอที่ป้าย X" — the boarding stop + distance from user
- ETA in minutes

CTA button: **"🔔 ติดตาม"** — starts notification tracking for all passing lines simultaneously

### State C — Tracking active
- Pulse indicator + "กำลังติดตาม"
- Live ETA per line (refresh every 10s)
- Mini map preview showing ⭐ boarding stop and 🎯 destination
- "⏹ หยุด" button to cancel tracking

---

## Notification Logic

```
User selects destination stop
  → Find all lines that pass through destination
  → For each passing line:
      Find nearest stop to user on that line's route (boarding stop)
  → Monitor each bus on those lines
  → When bus is 1 stop away from that line's boarding stop:
      Send push notification for that specific line
```

**Push notification content:**
- Title: `🟢 สายหน้ามอ — อีก 1 ป้าย!`
- Body: `รีบไปรอที่ป้าย CE เลยนะ รถมาใน ~2 นาที`

Each line sends its own notification independently. Blue line example: if Blue does not pass destination → no notification for Blue at all.

**Implementation:** Expo Push Notifications (device token, no account required). Backend stores `(device_token, destination_stop_id, boarding_stop_id_per_line[])` and evaluates proximity on each GPS poll cycle.

---

## Tab 3: สิ่งแวดล้อม (Sustainability)

Mirrors web `SustainabilityPanel`. Polls `/api/sustainability`.

- CO₂ saved banner (kg today + tree equivalent)
- 4 stat cards: ⚡ kWh, 🛣️ km, 🚌 active buses, 🌳 tree equiv
- Bar chart: CO₂ saved over last 7 days

---

## Tab 4: ร้องเรียน (Complaints)

**Form view:**
- 4 type cards (2×2 grid): คนขับ / สภาพรถ / ระบบแอป / อื่น ๆ
- Dropdown: select bus line
- Text area: detail
- Photo attachment (camera/gallery, optional)
- Submit button → `POST /api/complaints`

**History view** (toggle from form):
- List of user's past complaints (stored by device, no account)
- Status badge: รอดำเนินการ (yellow) / แก้ไขแล้ว (green)

---

## Data & API

All data comes from existing backend (`localhost:5000` / production URL):

| Endpoint | Used by |
|----------|---------|
| `GET /api/buses` | Map realtime positions |
| `GET /api/buses/:id` | Bus detail on tap |
| `GET /api/sustainability` | Tab 3 stats |
| `POST /api/complaints` | Tab 4 form submit |
| `POST /api/push/register` | Register device token (new) |
| `GET /api/stops` | Stop list for route planner (new or from KML) |

Bus stop data: parse from existing KML files (`up_bus_transit_*.kml`) or expose as `/api/stops` endpoint. Each stop needs: id, name, lat, lng, lines[].

Route membership (which stops belong to which line): derived from KML `<Placemark>` coordinates order — boarding stop = nearest stop on that line's ordered stop sequence, before the destination in travel direction.

---

## Tech Stack

- **Framework:** Expo SDK (latest stable)
- **Navigation:** Expo Router (file-based, tab layout)
- **Map:** react-native-maps (Apple Maps on iOS, Google Maps on Android)
- **Push notifications:** expo-notifications
- **State:** React hooks + SWR for polling
- **Shared types:** copy `BusData`, `BusDetail`, `SustainabilityData` from `frontend/lib/api.ts`
- **Storage:** expo-secure-store (device token), AsyncStorage (recent destinations, complaint history)

---

## Out of Scope

- Bus reservation (removed per design decision)
- Driver mode
- Admin panel
- User accounts / login
- Offline mode

---

## Open Questions

1. **Stop-to-line mapping:** KML files contain route polylines but stop names are defined in `js/script.js` (`allBusStops` object). Need to extract and expose as structured data before boarding stop logic can work.
2. **Boarding stop direction:** If a line is bidirectional, need to determine which direction the bus is heading relative to destination before choosing boarding stop.
3. **Push backend:** New endpoint `/api/push/register` and notification dispatch logic needed in backend. Expo push service requires server-side sending.
