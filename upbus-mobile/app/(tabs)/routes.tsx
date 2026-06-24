// upbus-mobile/app/(tabs)/routes.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LINE_STOPS, LINE_COLORS, LINE_NAMES } from '@/constants/stops';

type LineKey = 'Red' | 'Green' | 'Blue';

export default function RoutesScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>เส้นทางและป้ายหยุด</Text>
      {(['Red', 'Green', 'Blue'] as LineKey[]).map(line => (
        <View key={line} style={s.card}>
          <View style={[s.header, { backgroundColor: LINE_COLORS[line] }]}>
            <Text style={s.headerText}>{LINE_NAMES[line]}</Text>
          </View>
          {LINE_STOPS[line].map((stop, i) => (
            <View key={i} style={s.row}>
              <View style={[s.dot, { backgroundColor: LINE_COLORS[line] }]} />
              <Text style={s.stopName}>{stop.name}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content:   { padding: 16 },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  card:      { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  header:    { padding: 12 },
  headerText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  dot:       { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stopName:  { fontSize: 14, color: '#333' },
});
