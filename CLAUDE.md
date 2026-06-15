# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

UPBusTransit is a University of Phayao campus bus tracking system with a hybrid stack:

- **Frontend (PHP-served static pages)**: `index.php` (passenger map), `driver.php` (driver interface), `register.php` (driver registration). These are PHP files that serve pure HTML — no PHP logic, just static content served via XAMPP.
- **Backend (Node.js/Express on port 5000)**: `backend/index.js` is the single entry point. It handles GPS polling, admin dashboard, complaints, and evaluations. Routes for bus/driver operations live in `backend/busRoutes.js`.
- **Database**: MySQL via `backend/db.js` (connection pool). Database name: `db_bustransit`.
- **Admin UI**: EJS templates in `backend/views/` — `login.ejs`, `admin_bus.ejs`, `admin_complaints.ejs`, `admin_evaluations.ejs`.
- **Reverse proxy**: `web.config` (IIS) routes `/admin`, `/login`, `/complaints`, `/evaluate`, `/get` to `localhost:5000`. PHP pages are served directly by IIS/XAMPP.

## Key Data Flow

GPS data is fetched every 5 seconds from an external vendor API (`api01.sitgps.com`) and stored **only in RAM** (`cachedBusData` array in `index.js`). The `/get` endpoint merges this live GPS cache with DB data (bus color, driver name) before sending to the frontend map.

Bus IDs follow the pattern `TC001`–`TC030` (mapped from `bus_number` in DB via `"TC" + String(bus_number).padStart(3, "0")`).

## Database Tables

- `buses` — bus_number, status_color (Purple/Red/Green/Blue), current_driver_id
- `drivers` — id, line_user_id (LINE OA identity), full_name
- `admins` — username, password (plain text)
- `complaints` — topic (driver-service/bus-condition/system-wrong), bus_number, detail, image_file, status
- `evaluations_app` — service_score, status_score, efficiency_score
- `evaluations_travel` — comfort_score, time_score, safety_score

## Running the Backend

```bash
cd backend
npm install          # first time only
npm run dev          # development (nodemon, auto-restart)
npm start            # production
```

Production process manager (PM2):
```bash
pm2 start ecosystem.config.json
pm2 logs UPbustransit
```

Backend runs on **port 5000**. Frontend PHP pages served by XAMPP on port 80/443.

## Environment

`backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD="CesM.up@2025#"
DB_NAME=db_bustransit
PORT=5000
```

## Frontend Map (`js/script.js`)

Uses Leaflet.js for the map with KML route overlays (`*.kml` files). Bus stops are defined as a static object (`allBusStops`) with Thai-language labels. The map polls `/get` for live bus positions.

## Driver Flow

1. Driver opens `driver.php` — LINE LIFF identifies them via `line_user_id`
2. `GET /check-driver?line_id=` checks if registered
3. `GET /buses` lists all buses; driver selects bus + color
4. `POST /update-status` assigns driver to bus and sets color
5. `POST /stop-driving` clears driver assignment (sets status_color back to Purple)

## KML Route Files

- `up_bus_transit_red.kml` — Red line
- `up_bus_transit_green.kml` — Green line
- `up_bus_transit_blue.kml` — Blue line
- `up_bus_transit_all.kml` — All lines combined

Bus color "Purple" means the bus has no active driver assigned.
