import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useRef, useState, useEffect } from 'react';
import useSWR from 'swr';
import { getBuses, getKml, BusData } from '../../lib/api';
import BusMarker from '../../components/BusMarker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RoutePolyline {
  color: string;
  coords: LatLng[];
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

// ─── Line config ──────────────────────────────────────────────────────────────

const LINE_CONFIG = [
  { key: null,    label: 'ทุกสาย', color: '#ffffff', kmlLine: null },
  { key: 'Green', label: 'หน้ามอ', color: '#2ecc71', kmlLine: 'green' },
  { key: 'Blue',  label: 'ประตู3', color: '#3498db', kmlLine: 'blue'  },
  { key: 'Red',   label: 'หอพัก',  color: '#e74c3c', kmlLine: 'red'   },
] as const;

const KML_COLOR: Record<string, string> = {
  green: '#2ecc71',
  red:   '#e74c3c',
  blue:  '#3498db',
};

const UP_CAMPUS_REGION = {
  latitude: 19.0298,
  longitude: 99.9037,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [lineFilter, setLineFilter] = useState<string | null>(null);
  const [polylines, setPolylines] = useState<RoutePolyline[]>([]);

  // Poll buses every 10s
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  // Fetch all 3 KML files once at startup
  useEffect(() => {
    const lines = ['green', 'red', 'blue'] as const;
    Promise.all(
      lines.map(line =>
        getKml(line)
          .then(kmlText => {
            const segments = parseKmlCoordinates(kmlText);
            return segments.map(coords => ({ color: KML_COLOR[line], coords }));
          })
          .catch(() => [] as RoutePolyline[])
      )
    ).then(results => {
      setPolylines(results.flat());
    });
  }, []);

  // Filter buses: if a line is selected, only show buses on that line
  const displayedBuses = buses.filter(b => {
    if (!b.latitude || !b.longitude) return false;
    if (lineFilter) return b.color === lineFilter;
    return true;
  });

  // Filter polylines: if a line is selected, only show that line's routes
  const LINE_COLOR_KEY: Record<string, string> = {
    Green: '#2ecc71',
    Blue:  '#3498db',
    Red:   '#e74c3c',
  };
  const displayedPolylines = lineFilter
    ? polylines.filter(p => p.color === LINE_COLOR_KEY[lineFilter])
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
        showsUserLocation
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

        {/* Bus markers */}
        {displayedBuses.map(bus => (
          <BusMarker
            key={bus.imei_id}
            busId={bus.imei_id}
            lat={bus.latitude as number}
            lng={bus.longitude as number}
            color={bus.color}
          />
        ))}
      </MapView>

      {/* Line filter chips */}
      <View style={styles.chips}>
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
    top: 56,
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
