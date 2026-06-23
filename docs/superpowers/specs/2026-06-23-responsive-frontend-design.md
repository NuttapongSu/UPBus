# Responsive Frontend Design — UPBus Smart Transit

**Date:** 2026-06-23  
**Scope:** `frontend/` (Next.js + Tailwind CSS)  
**Goal:** Make the passenger-facing dashboard usable on mobile, tablet, and desktop without changing any backend or admin pages.

---

## Breakpoints

| Name | Range | Tailwind prefix |
|---|---|---|
| Mobile | < 768px | (default) |
| Tablet | 768px–1023px | `md:` |
| Desktop | 1024px+ | `lg:` |

---

## Layout per Breakpoint

### Mobile (< 768px)
- **Map** fills the full viewport (flex-1, below header)
- **Header** compact: logo/title + "ขอรถ" button only; search input and datetime hidden
- **BusLineCards** pinned at bottom (stays visible always)
- **Left Panel content** (SystemOverview, NearbyStops, BusApproachAlerts) → **BottomSheet 1**, triggered by FAB button bottom-left
- **Right Panel content** (BusDetailPanel / LineDetailPanel / SustainabilityPanel) → **BottomSheet 2**, opens automatically when bus or line is selected

### Tablet (768px–1023px)
- **Map** takes remaining width after right sidebar
- **Right Panel** visible as fixed sidebar (w-72) on the right
- **Left Panel** hidden by default, accessible via FAB bottom-left (BottomSheet 1 slides up)
- **Header** shows title + search + "ขอรถ" + Admin; hides datetime
- **BusLineCards** pinned at bottom

### Desktop (1024px+)
- Layout unchanged from current implementation: left sidebar (w-64) | map (flex-1) | right sidebar (w-72)
- All header elements visible

---

## New Component: `BottomSheet.tsx`

**Location:** `frontend/components/ui/BottomSheet.tsx`

**Snap states:**
- `hidden` — translated fully below viewport
- `peek` — shows ~80px (handle + title bar only)
- `expanded` — shows ~60vh of content, scrollable inside

**Behavior:**
- Drag handle (touch/mouse) cycles through states
- Tap backdrop closes to `hidden`
- Programmatic open: `isOpen` prop → expands to `expanded`
- Programmatic close: `onClose` callback

**Props:**
```ts
interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  defaultSnap?: 'peek' | 'expanded'  // default: 'expanded'
}
```

**Implementation notes:**
- Use CSS `transform: translateY()` + `transition` for smooth animation (no library)
- Touch events: `onTouchStart` / `onTouchMove` / `onTouchEnd` to track drag delta
- Sheet sits above map via `z-index: 50`; backdrop is semi-transparent overlay at `z-index: 40`
- Only rendered on mobile (`lg:hidden` wrapper)

---

## Modified Files

### `frontend/app/page.tsx`
1. Wrap entire layout in breakpoint-aware structure:
   - `lg:` → current 3-column flex layout
   - `md:` + default → map full-width + right sidebar conditional
2. Add FAB button (mobile + tablet only, `lg:hidden`): fixed, bottom-20 left-4, opens Sheet 1
3. Add BottomSheet 1 — wraps: SystemOverview, NearbyStops, BusApproachAlerts
4. Add BottomSheet 2 — wraps: BusDetailPanel / LineDetailPanel / SustainabilityPanel; auto-opens when `selectedBus` or `selectedLine` is set
5. Right sidebar: `hidden md:flex` (tablet+), left sidebar: `hidden lg:flex` (desktop only)
6. Header: search input `hidden md:flex`, datetime `hidden lg:block`

### `frontend/components/Dashboard/BusLineCards.tsx`
- Add `pb-safe` or `pb-2` on mobile so content above sheet handle isn't clipped
- No logic changes

---

## Out of Scope
- Admin pages (`frontend/app/admin/`)
- PHP pages (`index.php`, `driver.php`, `register.php`)
- Backend (`backend/`)
- Any new features or content changes

---

## Success Criteria
- Mobile (375px): Map fills screen, panels accessible via bottom sheets, no horizontal scroll
- Tablet (768px): Right sidebar visible, map fills remaining width, left panel via FAB
- Desktop (1024px): Layout identical to current, no regressions
