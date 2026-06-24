import { Text, View, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { BusData, BusColor } from '@/lib/api';

const COLOR_HEX: Record<BusColor, string> = {
  Red: '#e74c3c', Green: '#2ecc71', Blue: '#3498db',
  Purple: '#9b59b6', Orange: '#e67e22', Yellow: '#f1c40f', White: '#bdc3c7',
};

const LINE_LABEL: Record<BusColor, string> = {
  Red: 'Red Line', Green: 'Green Line', Blue: 'Blue Line',
  Purple: 'ไม่ระบุสาย', Orange: 'Orange Line', Yellow: 'Yellow Line', White: 'White Line',
};

function busNumber(imeiId: string) {
  const m = imeiId.match(/TC0*(\d+)/);
  return m ? m[1] : imeiId;
}

export default function BusMarker({ bus }: { bus: BusData }) {
  if (!bus.latitude || !bus.longitude) return null;

  const color = COLOR_HEX[bus.color] ?? '#9b59b6';
  const num = busNumber(bus.imei_id);

  return (
    <Marker
      coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      {/* วงกลมสีตามสาย + เลขรถ (เหมือน web) */}
      <View style={[s.circle, { backgroundColor: color }]}>
        <Text style={s.num}>{num}</Text>
      </View>

      {/* Popup เมื่อกด */}
      <Callout tooltip>
        <View style={s.callout}>
          <View style={[s.calloutHeader, { backgroundColor: color }]}>
            <Text style={s.calloutTitle}>🚌 {bus.imei_id}</Text>
          </View>
          <View style={s.calloutBody}>
            <Row icon="🎨" label="สาย" value={LINE_LABEL[bus.color] ?? bus.color} />
            <Row icon="👤" label="คนขับ" value={bus.driver || 'ไม่ระบุ'} />
            <Row icon="💨" label="ความเร็ว" value={`${bus.speed ?? 0} km/h`} />
            <Row icon="🔋" label="แบตเตอรี่" value={`${bus.soc ?? 0}%`} />
            <Row icon="📍" label="Lat" value={bus.latitude?.toFixed(6) ?? 'N/A'} />
            <Row icon="📍" label="Lng" value={bus.longitude?.toFixed(6) ?? 'N/A'} />
          </View>
        </View>
      </Callout>
    </Marker>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowIcon}>{icon}</Text>
      <Text style={s.rowLabel}>{label}:</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 6,
  },
  num: { color: '#fff', fontWeight: '900', fontSize: 14 },
  callout: {
    width: 220, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  calloutHeader: { paddingVertical: 8, paddingHorizontal: 12 },
  calloutTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  calloutBody: { padding: 10, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowIcon: { fontSize: 13, width: 20 },
  rowLabel: { fontSize: 12, color: '#666', width: 65 },
  rowValue: { fontSize: 12, color: '#111', fontWeight: '600', flex: 1 },
});
