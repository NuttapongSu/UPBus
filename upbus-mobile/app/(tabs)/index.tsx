// upbus-mobile/app/(tabs)/index.tsx
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { useBuses } from '@/hooks/useBuses';
import { LINE_STOPS, LINE_COLORS } from '@/constants/stops';
import { ROUTE_COORDS } from '@/constants/routes';
import BusMarker from '@/components/BusMarker';
import BusStopMarker from '@/components/BusStopMarker';

type LineKey = 'Red' | 'Green' | 'Blue';
const ALL_LINES: LineKey[] = ['Red', 'Green', 'Blue'];
const UP_REGION = { latitude: 19.029, longitude: 99.903, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function MapScreen() {
  const { buses, error } = useBuses();
  const [active, setActive] = useState<Set<LineKey>>(new Set(ALL_LINES));

  function toggle(line: LineKey) {
    setActive(prev => { const n = new Set(prev); n.has(line) ? n.delete(line) : n.add(line); return n; });
  }

  const visible = buses.filter(b =>
    b.color === 'Purple' || (ALL_LINES.includes(b.color as LineKey) && active.has(b.color as LineKey))
  );

  return (
    <View style={s.container}>
      <MapView style={s.map} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT} initialRegion={UP_REGION} showsUserLocation>
        {ALL_LINES.filter(l => active.has(l)).map(line => (
          <Polyline key={line}
            coordinates={ROUTE_COORDS[line]}
            strokeColor={LINE_COLORS[line]} strokeWidth={3} />
        ))}
        {ALL_LINES.filter(l => active.has(l)).flatMap(line =>
          LINE_STOPS[line].map(stop =>
            <BusStopMarker key={`${line}-${stop.name}`} stop={stop} color={LINE_COLORS[line]} />
          )
        )}
        {visible.map(bus => <BusMarker key={bus.imei_id} bus={bus} />)}
      </MapView>

      <View style={s.filters}>
        {ALL_LINES.map(line => (
          <TouchableOpacity key={line} style={[s.btn, { backgroundColor: active.has(line) ? LINE_COLORS[line] : '#ccc' }]} onPress={() => toggle(line)}>
            <Text style={s.btnText}>{line}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={s.errBanner}><Text style={s.errText}>ไม่สามารถโหลดข้อมูลรถได้</Text></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  filters:   { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  btn:       { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  errBanner: { position: 'absolute', top: 60, left: 16, right: 16, backgroundColor: '#e74c3c', padding: 8, borderRadius: 8 },
  errText:   { color: '#fff', textAlign: 'center' },
});
