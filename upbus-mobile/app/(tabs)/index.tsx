import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useRef, useState, useEffect, useMemo, useContext } from 'react';
import * as Location from 'expo-location';
import useSWR from 'swr';
import { getBuses, BusData } from '../../lib/api';
import { parseAllKml, LatLng, RoutePolyline, StopMarker } from '../../lib/kmlParser';
import { useAnimatedBuses, RouteMap, JunctionMap, TerminalMap } from '../../lib/useAnimatedBuses';
import BusMarker, { BusMarkerHandle } from '../../components/BusMarker';
import BusDetailSheet from '../../components/BusDetailSheet';
import { SlowLoadContext } from '../../lib/slowLoadContext';

const BUS_STOP_IMAGE = require('../../assets/images/bus-stop-1.png');

// ─── Stop arc-length sort ─────────────────────────────────────────────────────

const DEG2RAD_IDX = Math.PI / 180;
const R_EARTH_IDX = 6_371_000;

function hav(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG2RAD_IDX;
  const dLng = (lng2 - lng1) * DEG2RAD_IDX;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * DEG2RAD_IDX) * Math.cos(lat2 * DEG2RAD_IDX) * Math.sin(dLng / 2) ** 2;
  return R_EARTH_IDX * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stopArcLen(lat: number, lng: number, route: LatLng[]): number {
  let bestSegIdx = 0, bestT = 0, bestD = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i], p2 = route[i + 1];
    const dx = p2.longitude - p1.longitude, dy = p2.latitude - p1.latitude;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0
      ? Math.max(0, Math.min(1, ((lng - p1.longitude) * dx + (lat - p1.latitude) * dy) / len2))
      : 0;
    const pLat = p1.latitude + t * dy, pLng = p1.longitude + t * dx;
    const d = hav(lat, lng, pLat, pLng);
    if (d < bestD) { bestD = d; bestSegIdx = i; bestT = t; }
  }
  let arc = 0;
  for (let i = 0; i < bestSegIdx; i++) {
    arc += hav(route[i].latitude, route[i].longitude, route[i + 1].latitude, route[i + 1].longitude);
  }
  arc += bestT * hav(
    route[bestSegIdx].latitude, route[bestSegIdx].longitude,
    route[bestSegIdx + 1].latitude, route[bestSegIdx + 1].longitude,
  );
  return arc;
}

// ─── Line config ──────────────────────────────────────────────────────────────

const LINE_CONFIG = [
  { key: null,    label: 'ทุกสาย', color: '#ffffff', kmlLine: null },
  { key: 'Green', label: 'หน้ามอ', color: '#2ecc71', kmlLine: 'green' },
  { key: 'Blue',  label: 'ประตู3', color: '#3498db', kmlLine: 'blue'  },
  { key: 'Red',   label: 'หอพัก',  color: '#e74c3c', kmlLine: 'red'   },
] as const;

const EMPTY_BUSES: BusData[] = [];

const UP_CAMPUS_REGION = {
  latitude: 19.0298,
  longitude: 99.9037,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const [lineFilter, setLineFilter] = useState<string | null>(null);
  const [polylines, setPolylines] = useState<RoutePolyline[]>([]);
  const [stops, setStops] = useState<StopMarker[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const slowLoad = useContext(SlowLoadContext);
  const [showSlowBanner, setShowSlowBanner] = useState(slowLoad);

  useEffect(() => {
    if (!slowLoad) return;
    const id = setTimeout(() => setShowSlowBanner(false), 4000);
    return () => clearTimeout(id);
  }, [slowLoad]);

  // Request location permission and center map on user at startup
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationGranted(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 800);
    })();
  }, []);

  // Poll buses every 5s
  const { data: buses = EMPTY_BUSES } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  // Build route map from parsed polylines (memoised — changes only at startup).
  // junctionMap: two-segment routes (Green/Red) — last index of Seg1, used to
  //   lock bus to current leg and prevent cross-leg snapping.
  // terminalMap: single-segment circular routes (Blue) — 90% of route length,
  //   prevents false wrap-back to idx=0 when bus approaches the terminal whose
  //   geographic location is the same as the route start point.
  const { routeMap, junctionMap, terminalMap } = useMemo<{
    routeMap: RouteMap; junctionMap: JunctionMap; terminalMap: TerminalMap;
  }>(() => {
    const bangkokHour = parseInt(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }),
      10,
    );
    const routeMap    = new Map<string, { lat: number; lng: number }[]>();
    const junctionMap = new Map<string, number>();
    const terminalMap = new Map<string, number>();
    for (const color of ['Green', 'Red', 'Blue']) {
      const segs = polylines.filter(p => p.lineKey === color);
      if (segs.length === 0) continue;
      const combined = segs.flatMap(s => s.coords.map(c => ({ lat: c.latitude, lng: c.longitude })));
      if (segs.length >= 2) {
        const pkyJunction = segs[0].coords.length - 1;
        // Before 14:00 Green turns around at อธิการบดี — clip motion route so
        // engine treats it as a true two-segment route ending there (like PKY).
        if (color === 'Green' && bangkokHour < 14) {
          const RECTOR_LAT = 19.0290, RECTOR_LNG = 99.8961;
          let fwdIdx = 0, fwdD = Infinity;
          for (let i = 0; i <= pkyJunction; i++) {
            const c = combined[i];
            const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
            if (d < fwdD) { fwdD = d; fwdIdx = i; }
          }
          let retIdx = pkyJunction + 1, retD = Infinity;
          for (let i = pkyJunction + 1; i < combined.length; i++) {
            const c = combined[i];
            const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
            if (d < retD) { retD = d; retIdx = i; }
          }
          if (fwdIdx > 0 && retIdx > pkyJunction) {
            const clipped = [...combined.slice(0, fwdIdx + 1), ...combined.slice(retIdx)];
            routeMap.set(color, clipped);
            junctionMap.set(color, fwdIdx);
            continue;
          }
        }
        routeMap.set(color, combined);
        junctionMap.set(color, pkyJunction);
      } else {
        routeMap.set(color, combined);
        terminalMap.set(color, Math.floor(combined.length * 0.9));
      }
    }
    return { routeMap, junctionMap, terminalMap };
  }, [polylines]);

  // Group stops by route color, sorted by arc-length along the route polyline.
  // KML document order is arbitrary — direction detection requires stops in
  // traversal order so that stops[nearestIdx+1] reliably points "ahead".
  const stopsByRoute = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }[]>();
    for (const stop of stops) {
      if (!stop.lineKey) continue;
      if (!m.has(stop.lineKey)) m.set(stop.lineKey, []);
      m.get(stop.lineKey)!.push({ lat: stop.lat, lng: stop.lng });
    }
    for (const [lineKey, lineStops] of m) {
      // Use routeMap (already clipped for Green before 14:00) for arc-length sort
      const motionRoute = routeMap.get(lineKey);
      const routeCoords = motionRoute
        ? motionRoute.map(p => ({ latitude: p.lat, longitude: p.lng }))
        : polylines.filter(p => p.lineKey === lineKey).flatMap(p => p.coords);
      if (routeCoords.length > 1) {
        lineStops.sort((a, b) => stopArcLen(a.lat, a.lng, routeCoords) - stopArcLen(b.lat, b.lng, routeCoords));
      }
    }
    return m;
  }, [stops, routeMap]);

  const markerRefs = useRef<Map<string, BusMarkerHandle>>(new Map());
  const { positionRef: busPositions, activeBusIds, chargingBusIds } = useAnimatedBuses(buses, routeMap, stopsByRoute, markerRefs, junctionMap, terminalMap);

  // Follow selected bus — read position via ref to avoid re-creating interval every frame
  useEffect(() => {
    if (!selectedBusId) return;
    const id = setInterval(() => {
      const anim = busPositions.current?.get(selectedBusId);
      if (!anim) return;
      mapRef.current?.animateCamera(
        { center: { latitude: anim.lat, longitude: anim.lng } },
        { duration: 150 },
      );
    }, 200);
    return () => clearInterval(id);
  }, [selectedBusId]);

  // Parse all KML files once at startup — polylines and stops from bundled assets
  useEffect(() => {
    const { polylines, stops } = parseAllKml();
    setPolylines(polylines);
    setStops(stops);
  }, []);

  // Filter stops: if a line is selected, only show stops on that line
  const displayedStops = stops.filter(s =>
    lineFilter ? s.lineKey === lineFilter : true
  );

  // Filter buses: animated position exists + line filter
  const displayedBuses = buses.filter(b => {
    if (!activeBusIds.has(b.imei_id)) return false;
    if (lineFilter && b.color !== lineFilter) return false;
    return true;
  });

  // Moving = ignition on + speed above the same threshold busMotionEngine uses to animate
  const movingBusCount = displayedBuses.filter(b => b.acc === 1 && b.speed >= 5).length;
  const chargingBusCount = displayedBuses.filter(b => chargingBusIds.has(b.imei_id)).length;
  const totalBusCount = displayedBuses.length;
  const parkedBusCount = totalBusCount - movingBusCount - chargingBusCount;

  // Auto-close sheet only after 2 consecutive missed polls (≥10s), not on transient API dropout
  const missCountRef = useRef(0);
  useEffect(() => {
    if (!selectedBusId) { missCountRef.current = 0; return; }
    if (!displayedBuses.find(b => b.imei_id === selectedBusId)) {
      missCountRef.current += 1;
      if (missCountRef.current >= 2) {
        missCountRef.current = 0;
        setSelectedBusId(null);
      }
    } else {
      missCountRef.current = 0;
    }
  }, [displayedBuses, selectedBusId]);

  // ทุกสาย → แสดงทุกเส้น (สีตามสาย), กรองตามสาย → แสดงเส้นนั้นอย่างเดียว
  const displayedPolylines = lineFilter
    ? polylines.filter(p => p.lineKey === lineFilter)
    : polylines;

  const handleChipPress = (key: string | null) => {
    setLineFilter(prev => (prev === key ? null : key));
  };

  return (
    <View style={styles.container}>
      {showSlowBanner && (
        <View style={[styles.slowBanner, { top: insets.top + 4 }]}>
          <Text style={styles.slowBannerText}>โหลดข้อมูลรถช้ากว่าปกติ กำลังลองใหม่...</Text>
        </View>
      )}
      {/* ─── Header bar ─────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerCell}>
          <Text style={styles.headerLabel}>ทั้งหมด</Text>
          <Text style={styles.headerValue}>{totalBusCount} คัน</Text>
        </View>
        <View style={[styles.headerCell, styles.headerCellCenter]}>
          <Text style={styles.headerLabel}>จอด</Text>
          <Text style={styles.headerValue}>{parkedBusCount} คัน</Text>
        </View>
        <View style={[styles.headerCell, styles.headerCellCenter]}>
          <Text style={styles.headerLabel}>ชาร์จ</Text>
          <Text style={styles.headerValue}>{chargingBusCount} คัน</Text>
        </View>
        <View style={[styles.headerCell, styles.headerCellRight]}>
          <Text style={styles.headerLabel}>วิ่ง</Text>
          <Text style={styles.headerValue}>{movingBusCount} คัน</Text>
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
        {/* Route polylines from KML */}
        {displayedPolylines.map((pl, idx) => (
          <Polyline
            key={`pl-${idx}`}
            coordinates={pl.coords}
            strokeColor={pl.color}
            strokeWidth={3}
          />
        ))}

        {/* Bus stop markers */}
        {displayedStops.map(stop => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.name}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image source={BUS_STOP_IMAGE} style={{ width: 36, height: 36 }} resizeMode="contain" />
          </Marker>
        ))}

        {/* Bus markers — animated position */}
        {displayedBuses.map(bus => {
          const anim = busPositions.current?.get(bus.imei_id);
          if (!anim) return null;
          return (
            <BusMarker
              key={bus.imei_id}
              ref={el => { if (el) markerRefs.current.set(bus.imei_id, el); else markerRefs.current.delete(bus.imei_id); }}
              busId={bus.imei_id}
              lat={anim.lat}
              lng={anim.lng}
              color={bus.color}
              department={bus.department}
              bearing={anim.bearing}
              isSelected={bus.imei_id === selectedBusId}
              onPress={() => setSelectedBusId(bus.imei_id)}
            />
          );
        })}
      </MapView>

      {/* Bus detail bottom sheet */}
      <BusDetailSheet
        bus={buses.find(b => b.imei_id === selectedBusId) ?? null}
        onClose={() => setSelectedBusId(null)}
      />

      {/* Line filter chips — bottom */}
      {!selectedBusId && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slowBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(124,58,237,0.95)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  slowBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  chips: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15,15,26,0.85)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#0f0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3a',
    paddingHorizontal: 21,
    paddingBottom: 10,
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
});
