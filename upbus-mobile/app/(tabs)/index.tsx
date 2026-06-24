import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Platform, ScrollView } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useBuses } from '@/hooks/useBuses';
import { LINE_STOPS, LINE_COLORS, LINE_NAMES } from '@/constants/stops';
import { ROUTE_COORDS } from '@/constants/routes';
import { BusData } from '@/lib/api';
import BusMarker from '@/components/BusMarker';
import BusStopMarker from '@/components/BusStopMarker';

type LineKey = 'Red' | 'Green' | 'Blue';
const ALL_LINES: LineKey[] = ['Red', 'Green', 'Blue'];
const UP_REGION = { latitude: 19.029, longitude: 99.903, latitudeDelta: 0.025, longitudeDelta: 0.025 };

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStop(line: LineKey, lat: number, lng: number) {
  return LINE_STOPS[line].reduce((best, stop) => {
    const d = haversineM(lat, lng, stop.lat, stop.lng);
    return d < best.dist ? { stop, dist: d } : best;
  }, { stop: LINE_STOPS[line][0], dist: Infinity });
}

function nearestBus(buses: BusData[], line: LineKey, stopLat: number, stopLng: number) {
  const lineBuses = buses.filter(b => b.color === line && b.latitude && b.longitude);
  if (!lineBuses.length) return null;
  return lineBuses.reduce((best, bus) => {
    const d = haversineM(bus.latitude!, bus.longitude!, stopLat, stopLng);
    return d < best.dist ? { bus, dist: d } : best;
  }, { bus: lineBuses[0], dist: Infinity });
}

export default function MapScreen() {
  const { buses, error } = useBuses();
  const [active, setActive] = useState<Set<LineKey>>(new Set(ALL_LINES));
  const [selectedLine, setSelectedLine] = useState<LineKey | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        loc => setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      );
    })();
  }, []);

  function toggleLine(line: LineKey) {
    setActive(prev => { const n = new Set(prev); n.has(line) ? n.delete(line) : n.add(line); return n; });
  }

  function centerOnUser() {
    if (!userPos) return;
    mapRef.current?.animateToRegion({
      latitude: userPos.lat, longitude: userPos.lng,
      latitudeDelta: 0.008, longitudeDelta: 0.008,
    }, 800);
  }

  const visible = buses.filter(b =>
    b.color === 'Purple' || (ALL_LINES.includes(b.color as LineKey) && active.has(b.color as LineKey))
  );

  // Board info for selected line
  let boardInfo: { stopName: string; stopDist: number; busDist: number; etaMin: number } | null = null;
  if (selectedLine && userPos) {
    const { stop, dist: stopDist } = nearestStop(selectedLine, userPos.lat, userPos.lng);
    const busResult = nearestBus(buses, selectedLine, stop.lat, stop.lng);
    if (busResult) {
      const speedMps = Math.max((busResult.bus.speed || 20) * 1000 / 3600, 1);
      boardInfo = {
        stopName: stop.name,
        stopDist: Math.round(stopDist),
        busDist: Math.round(busResult.dist),
        etaMin: Math.max(1, Math.round(busResult.dist / speedMps / 60)),
      };
    }
  }

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        mapType="hybrid"
        initialRegion={UP_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {ALL_LINES.filter(l => active.has(l)).map(line => (
          <Polyline key={line} coordinates={ROUTE_COORDS[line]}
            strokeColor={LINE_COLORS[line]} strokeWidth={3} />
        ))}
        {ALL_LINES.filter(l => active.has(l)).flatMap(line =>
          LINE_STOPS[line].map(stop =>
            <BusStopMarker key={`${line}-${stop.name}`} stop={stop} color={LINE_COLORS[line]} />
          )
        )}
        {visible.map(bus => <BusMarker key={bus.imei_id} bus={bus} />)}
      </MapView>

      {/* ปุ่มกลับมาที่ตำแหน่งผู้ใช้ */}
      <TouchableOpacity style={s.locBtn} onPress={centerOnUser}>
        <Text style={s.locBtnText}>📍</Text>
      </TouchableOpacity>

      {/* พิกัดผู้ใช้ */}
      {userPos && (
        <View style={s.coordBadge}>
          <Text style={s.coordText}>
            {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
          </Text>
        </View>
      )}

      {/* แถบด้านล่าง */}
      <View style={s.bottom}>
        {/* ตัวกรองสาย */}
        <View style={s.filterRow}>
          {ALL_LINES.map(line => (
            <TouchableOpacity key={line}
              style={[s.filterBtn, { backgroundColor: active.has(line) ? LINE_COLORS[line] : '#555' }]}
              onPress={() => toggleLine(line)}>
              <Text style={s.filterText}>{line}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* เลือกสายที่จะขึ้น */}
        <Text style={s.boardLabel}>🎯 ฉันจะขึ้นสาย</Text>
        <View style={s.boardRow}>
          {ALL_LINES.map(line => (
            <TouchableOpacity key={line}
              style={[s.boardBtn, {
                backgroundColor: selectedLine === line ? LINE_COLORS[line] : 'transparent',
                borderColor: LINE_COLORS[line],
              }]}
              onPress={() => setSelectedLine(prev => prev === line ? null : line)}>
              <Text style={[s.boardBtnText, { color: selectedLine === line ? '#fff' : LINE_COLORS[line] }]}>
                {LINE_NAMES[line]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ข้อมูล ETA */}
        {selectedLine && (
          <View style={[s.etaCard, { borderLeftColor: LINE_COLORS[selectedLine] }]}>
            {!userPos ? (
              <Text style={s.etaWait}>⏳ รอสัญญาณ GPS…</Text>
            ) : !boardInfo ? (
              <Text style={s.etaWait}>ไม่มีรถสาย{selectedLine}วิ่งขณะนี้</Text>
            ) : (
              <>
                <Text style={s.etaStop}>🚏 {boardInfo.stopName}</Text>
                <Text style={s.etaDist}>ห่างจากคุณ {boardInfo.stopDist} ม.</Text>
                <Text style={[s.etaTime, { color: LINE_COLORS[selectedLine] }]}>
                  🚌 รถอยู่ห่าง {boardInfo.busDist} ม. • ถึงใน ~{boardInfo.etaMin} นาที
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {error && (
        <View style={s.errBanner}><Text style={s.errText}>ไม่สามารถโหลดข้อมูลรถได้</Text></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  map:          { flex: 1 },
  locBtn:       { position: 'absolute', top: 60, right: 16, backgroundColor: '#fff', borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  locBtnText:   { fontSize: 22 },
  coordBadge:   { position: 'absolute', top: 60, left: 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  coordText:    { color: '#fff', fontSize: 11, fontVariant: ['tabular-nums'] },
  bottom:       { backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  filterRow:    { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 },
  filterBtn:    { paddingVertical: 6, paddingHorizontal: 18, borderRadius: 16 },
  filterText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  boardLabel:   { color: '#aaa', fontSize: 12, marginBottom: 8 },
  boardRow:     { flexDirection: 'row', gap: 8, marginBottom: 10 },
  boardBtn:     { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  boardBtnText: { fontSize: 12, fontWeight: '700' },
  etaCard:      { backgroundColor: 'rgba(255,255,255,0.08)', borderLeftWidth: 4, borderRadius: 8, padding: 10 },
  etaWait:      { color: '#888', fontSize: 13 },
  etaStop:      { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  etaDist:      { color: '#aaa', fontSize: 12, marginBottom: 4 },
  etaTime:      { fontSize: 13, fontWeight: '700' },
  errBanner:    { position: 'absolute', top: 60, left: 16, right: 16, backgroundColor: '#e74c3c', padding: 8, borderRadius: 8 },
  errText:      { color: '#fff', textAlign: 'center' },
});
