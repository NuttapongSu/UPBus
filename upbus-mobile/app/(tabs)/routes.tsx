import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import * as Location from 'expo-location';
import { getBuses, getStops, BusStop, BusData } from '../../lib/api';
import { findPassingLines, findBoardingStop, calcEtaMinutes, haversine } from '../../lib/stops';
import RouteResultCard from '../../components/RouteResultCard';
import { useTrackingStore } from '../../lib/notifications';

export default function RoutesScreen() {
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<BusStop | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const tracking = useTrackingStore();

  const { data: stops = [] } = useSWR<BusStop[]>('/api/stops', getStops);
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  // Get user location once
  useSWR('user-location', async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    return loc;
  });

  const filtered = query.length > 0
    ? stops.filter(s => s.name.includes(query))
    : stops;

  const passingLines = destination ? findPassingLines(stops, destination.id) : [];

  const lineResults = useMemo(() => {
    if (!destination || !userPos) return [];
    return ['Green', 'Red', 'Blue'].map(lc => {
      const passes = passingLines.includes(lc);
      const boarding = passes ? findBoardingStop(stops, lc, userPos.lat, userPos.lng) : null;
      const matchingBus = buses.find(b => b.color === lc && b.latitude && b.longitude);
      const eta = boarding && matchingBus ? calcEtaMinutes(matchingBus, boarding) : null;
      const dist = boarding ? haversine(userPos.lat, userPos.lng, boarding.lat, boarding.lng) : 0;
      return { lineColor: lc, passes, boarding, eta, dist };
    });
  }, [destination, userPos, stops, buses, passingLines]);

  async function handleTrack() {
    if (!destination) return;
    const boardingStops = lineResults
      .filter(r => r.passes && r.boarding)
      .map(r => ({ lineColor: r.lineColor, stop: r.boarding! }));
    await tracking.startTracking(destination, boardingStops);
  }

  if (tracking.isTracking) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14, gap: 10 }}>
        <View style={styles.trackingCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.pulseDot} />
            <Text style={{ color: '#a78bfa', fontSize: 10, fontWeight: '700', flex: 1 }}>กำลังติดตาม</Text>
            <TouchableOpacity onPress={tracking.stopTracking} style={styles.stopBtn}>
              <Text style={{ color: '#888', fontSize: 9 }}>⏹ หยุด</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
            🎯 {tracking.destinationStop?.name}
          </Text>
          {tracking.etaRows.map(row => (
            <View key={row.lineColor} style={styles.etaRow}>
              <View style={[styles.badge, { backgroundColor: row.color }]}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{row.lineColor}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>{row.lineName}</Text>
                <Text style={{ color: '#888', fontSize: 8 }}>📍 {tracking.boardingStop?.name}</Text>
              </View>
              <Text style={{ color: row.color, fontSize: 16, fontWeight: '800' }}>
                {row.eta != null ? `~${row.eta}` : '—'}
              </Text>
              <Text style={{ color: '#888', fontSize: 8 }}> น.</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        <Text style={styles.sectionTitle}>🎯 ฉันต้องการไปที่...</Text>
        <TextInput
          style={styles.searchBox}
          placeholder="ค้นหาป้ายปลายทาง..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
        />

        {!destination ? (
          <FlatList
            data={filtered.slice(0, 20)}
            keyExtractor={s => s.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stopRow}
                onPress={() => { setDestination(item); setQuery(''); }}
              >
                <Text style={{ fontSize: 14 }}>🚏</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                    {item.lines.map(l => (
                      <View
                        key={l}
                        style={[
                          styles.lineDot,
                          { backgroundColor: l === 'Green' ? '#2ecc71' : l === 'Red' ? '#e74c3c' : '#3498db' },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <>
            <View style={styles.destSelected}>
              <Text style={{ color: '#888', fontSize: 9 }}>ปลายทางที่เลือก</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>{destination.name}</Text>
                <TouchableOpacity onPress={() => setDestination(null)} style={styles.changeBtn}>
                  <Text style={{ color: '#888', fontSize: 9 }}>✕ เปลี่ยน</Text>
                </TouchableOpacity>
              </View>
              {lineResults.map(r => (
                <RouteResultCard
                  key={r.lineColor}
                  lineColor={r.lineColor}
                  boardingStopName={r.boarding?.name ?? ''}
                  distanceM={r.dist}
                  etaMinutes={r.eta}
                  passes={r.passes}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                🔔 ติดตาม — แจ้งเตือนอัตโนมัติ
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f0f1a' },
  sectionTitle: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBox: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#3a3a6a',
    borderRadius: 9,
    padding: 10,
    color: '#fff',
    fontSize: 13,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 6,
  },
  stopName: { color: '#fff', fontSize: 11, fontWeight: '600' },
  lineDot: { width: 7, height: 7, borderRadius: 3.5 },
  destSelected: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    gap: 6,
  },
  changeBtn: {
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trackBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  trackingCard: {
    backgroundColor: '#0f0f1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a78bfa55',
    padding: 10,
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ecc71' },
  stopBtn: {
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3a',
  },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
});
