import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { getSustainability, SustainabilityData } from '../../lib/api';

const LINE_COLOR = '#7c3aed';
const MAX_BAR_H = 60;

export default function SustainabilityScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useSWR<SustainabilityData>('/api/sustainability', getSustainability, { refreshInterval: 60000 });
  const t = data?.today;
  const weekly = data?.weekly ?? [];
  const maxCo2 = Math.max(...weekly.map(w => w.co2), 1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f0f1a' }} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 14, gap: 12 }}>
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerLabel}>วันนี้ประหยัด CO₂</Text>
          <Text style={styles.bannerNum}>{t?.co2_saved_kg?.toFixed(1) ?? '—'} <Text style={styles.bannerUnit}>kg</Text></Text>
          <Text style={styles.bannerDesc}>= ปลูกต้นไม้ {t?.trees_equiv ?? '—'} ต้น 🌳</Text>
        </View>
        <Text style={{ fontSize: 47 }}>🌍</Text>
      </View>

      <Text style={styles.sectionTitle}>วันนี้</Text>
      <View style={styles.statGrid}>
        {[
          { icon: '⚡', val: `${t?.kwh_used ?? '—'}`, unit: 'kWh', label: 'พลังงาน', color: '#f59e0b' },
          { icon: '🛣️', val: `${t?.km_total ?? '—'}`, unit: 'กม.', label: 'ระยะทาง', color: '#3b82f6' },
          { icon: '🚌', val: `${t?.buses_active ?? '—'}`, unit: 'คัน', label: 'รถวิ่ง', color: '#2ecc71' },
          { icon: '🌳', val: `${t?.trees_equiv ?? '—'}`, unit: 'ต้น', label: 'เทียบต้นไม้', color: '#2ecc71' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={{ fontSize: 21 }}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val} <Text style={styles.statUnit}>{s.unit}</Text></Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>CO₂ ที่ประหยัด 7 วัน (kg)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: MAX_BAR_H + 20 }}>
          {weekly.map(w => (
            <View key={w.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={[styles.bar, { height: Math.max((w.co2 / maxCo2) * MAX_BAR_H, 3), backgroundColor: LINE_COLOR }]} />
              <Text style={styles.barDay}>{w.day.slice(5)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#2ecc71', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center' },
  bannerLabel: { color: '#888', fontSize: 13 },
  bannerNum: { color: '#2ecc71', fontSize: 36, fontWeight: '800', marginVertical: 2 },
  bannerUnit: { fontSize: 16, color: '#888' },
  bannerDesc: { color: '#aaa', fontSize: 14 },
  sectionTitle: { color: '#a78bfa', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 13, padding: 13, width: '47%', gap: 2 },
  statVal: { fontSize: 26, fontWeight: '800' },
  statUnit: { fontSize: 14, color: '#888', fontWeight: '400' },
  statLabel: { color: '#888', fontSize: 13 },
  chartCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 13, padding: 13 },
  chartTitle: { color: '#888', fontSize: 13, marginBottom: 10 },
  bar: { width: '100%', borderRadius: 3 },
  barDay: { color: '#666', fontSize: 12 },
});
