import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as Location from 'expo-location';
import useSWR from 'swr';
import { getBuses, getKml, BusData } from '../../lib/api';
import { useAnimatedBuses, RouteMap } from '../../lib/useAnimatedBuses';
import BusMarker from '../../components/BusMarker';
import BusDetailSheet from '../../components/BusDetailSheet';

const BUS_STOP_IMAGE = require('../../assets/images/bus-stop-1.png');

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RoutePolyline {
  color: string;
  lineKey: string;
  coords: LatLng[];
}

interface StopMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lineKey: string;
}

// ─── KML parser ───────────────────────────────────────────────────────────────

function parseKmlCoordinates(kmlText: string): LatLng[][] {
  const results: LatLng[][] = [];
  // Match each <coordinates>…</coordinates> block
  const coordBlockRe = /<coordinates>([\s\S]*?)<\/coordinates>/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = coordBlockRe.exec(kmlText)) !== null) {
    const block = blockMatch[1].trim();
    if (!block) continue;
    // Each token is "lng,lat,alt"
    const coords: LatLng[] = [];
    const tokenRe = /(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,-?\d+\.?\d*)?/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(block)) !== null) {
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords.push({ latitude: lat, longitude: lng });
      }
    }
    if (coords.length > 1) results.push(coords);
  }
  return results;
}

const EXCLUDED_STOP_KEYWORDS = ['ชาร์จ'];

function parseKmlStops(kmlText: string, lineKey: string): StopMarker[] {
  const stops: StopMarker[] = [];
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = placemarkRe.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameMatch = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) continue;
    const name = nameMatch ? nameMatch[1].trim() : '';
    if (EXCLUDED_STOP_KEYWORDS.some(kw => name.includes(kw))) continue;
    const parts = coordMatch[1].trim().split(',').map(Number);
    const lng = parts[0], lat = parts[1];
    if (isNaN(lat) || isNaN(lng)) continue;
    stops.push({ id: `${lineKey}-${lng}-${lat}`, name, lat, lng, lineKey });
  }
  return stops;
}

// ─── Line config ──────────────────────────────────────────────────────────────

const LINE_CONFIG = [
  { key: null,    label: 'ทุกสาย', color: '#ffffff', kmlLine: null },
  { key: 'Green', label: 'หน้ามอ', color: '#2ecc71', kmlLine: 'green' },
  { key: 'Blue',  label: 'ประตู3', color: '#3498db', kmlLine: 'blue'  },
  { key: 'Red',   label: 'หอพัก',  color: '#e74c3c', kmlLine: 'red'   },
] as const;

const KML_SOURCES: { file: string; lineKey: string; color: string }[] = [
  { file: 'green',    lineKey: 'Green', color: '#2ecc71' },
  { file: 'red',      lineKey: 'Red',   color: '#e74c3c' },
  { file: 'blue',     lineKey: 'Blue',  color: '#3498db' },
];

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
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  // Build route map from parsed polylines (memoised — changes only at startup)
  const routeMap = useMemo<RouteMap>(() => {
    const m = new Map<string, { lat: number; lng: number }[]>();
    for (const color of ['Green', 'Red', 'Blue']) {
      const segs = polylines.filter(p => p.lineKey === color);
      if (segs.length > 0) {
        m.set(color, segs.flatMap(s => s.coords.map(c => ({ lat: c.latitude, lng: c.longitude }))));
      }
    }
    return m;
  }, [polylines]);

  // Group stops by route color for direction detection
  const stopsByRoute = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }[]>();
    for (const stop of stops) {
      if (!stop.lineKey) continue;
      if (!m.has(stop.lineKey)) m.set(stop.lineKey, []);
      m.get(stop.lineKey)!.push({ lat: stop.lat, lng: stop.lng });
    }
    return m;
  }, [stops]);

  const animatedBuses = useAnimatedBuses(buses, routeMap, stopsByRoute);
  const animatedBusesRef = useRef(animatedBuses);
  useEffect(() => { animatedBusesRef.current = animatedBuses; }, [animatedBuses]);

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

  // Fetch all KML files once at startup — parse both polylines and stops
  useEffect(() => {
    Promise.all(
      KML_SOURCES.map(src =>
        getKml(src.file)
          .then(kmlText => {
            const segments = parseKmlCoordinates(kmlText);
            const kmlStops = parseKmlStops(kmlText, src.lineKey);
            console.log(`[KML] ${src.file}: ${segments.length} segments, ${kmlStops.length} stops`);
            return {
              polylines: segments.map((coords): RoutePolyline => ({ color: src.color, lineKey: src.lineKey, coords })),
              stops: kmlStops,
            };
          })
          .catch(e => {
            console.warn(`[KML] ${src.file} FAILED:`, e.message);
            return { polylines: [] as RoutePolyline[], stops: [] as StopMarker[] };
          })
      )
    ).then(results => {
      setPolylines(results.flatMap(r => r.polylines));
      setStops(results.flatMap(r => r.stops));
    });
  }, []);

  // Filter stops: if a line is selected, only show stops on that line
  const displayedStops = stops.filter(s =>
    lineFilter ? s.lineKey === lineFilter : true
  );

  // Filter buses: animated position exists + line filter
  const displayedBuses = buses.filter(b => {
    const anim = animatedBuses.get(b.imei_id);
    if (!anim) return false;
    if (lineFilter && b.color !== lineFilter) return false;
    return true;
  });

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
      </MapView>

      {/* Bus detail bottom sheet */}
      <BusDetailSheet
        bus={buses.find(b => b.imei_id === selectedBusId) ?? null}
        onClose={() => setSelectedBusId(null)}
      />

      {/* Line filter chips */}
      <View style={[styles.chips, { top: insets.top + 8 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  chips: {
    position: 'absolute',
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15,15,26,0.85)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
