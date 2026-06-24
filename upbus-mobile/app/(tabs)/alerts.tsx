// upbus-mobile/app/(tabs)/alerts.tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePushToken } from '@/hooks/usePushToken';
import { LINE_COLORS, LINE_NAMES } from '@/constants/stops';

type LineKey = 'Red' | 'Green' | 'Blue';
const ALL_LINES: LineKey[] = ['Red', 'Green', 'Blue'];
const LINES_KEY = '@upbus/subscribedLines';

export default function AlertsScreen() {
  const { token, updateLines } = usePushToken();
  const [subscribed, setSubscribed] = useState<Set<LineKey>>(new Set(ALL_LINES));

  useEffect(() => {
    AsyncStorage.getItem(LINES_KEY).then(raw => {
      if (raw) setSubscribed(new Set(JSON.parse(raw) as LineKey[]));
    });
  }, []);

  function toggle(line: LineKey) {
    const next = new Set(subscribed);
    next.has(line) ? next.delete(line) : next.add(line);
    setSubscribed(next);
    updateLines([...next]);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>ตั้งค่าการแจ้งเตือน</Text>
      <Text style={s.sub}>แจ้งเตือนเมื่อรถอยู่ห่างจากป้าย &lt; 200 เมตร</Text>

      {ALL_LINES.map(line => (
        <View key={line} style={s.row}>
          <View style={[s.dot, { backgroundColor: LINE_COLORS[line] }]} />
          <Text style={s.name}>{LINE_NAMES[line]}</Text>
          <Switch value={subscribed.has(line)} onValueChange={() => toggle(line)}
            trackColor={{ true: LINE_COLORS[line] }} />
        </View>
      ))}

      {!token && (
        <View style={s.notice}>
          <Text style={s.noticeText}>กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าอุปกรณ์</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content:   { padding: 16 },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  sub:       { fontSize: 13, color: '#666', marginBottom: 24 },
  row:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  dot:       { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  name:      { flex: 1, fontSize: 16, fontWeight: '500' },
  notice:    { marginTop: 16, padding: 12, backgroundColor: '#fef3cd', borderRadius: 8, borderWidth: 1, borderColor: '#ffc107' },
  noticeText:{ color: '#856404', fontSize: 13 },
});
