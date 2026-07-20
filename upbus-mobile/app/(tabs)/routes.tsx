import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import * as Location from 'expo-location';
import { getBuses, BusStop, BusData } from '../../lib/api';
import { findPassingLines, findBoardingStop, findApproachingBus, calcEtaMinutes, haversine, findTransferRoutes } from '../../lib/stops';
import { useKmlStops } from '../../lib/useKmlStops';
import { useRouteMap } from '../../lib/useRouteMap';
import RouteResultCard from '../../components/RouteResultCard';
import TransferCard from '../../components/TransferCard';
import { useTrackingStore } from '../../lib/notifications';

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<BusStop | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const tracking = useTrackingStore();

  const stops = useKmlStops();
  const routeMap = useRouteMap();
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
      // findBoardingStop returns null if no stop within 500m
      const boarding = passes ? findBoardingStop(stops, lc, userPos.lat, userPos.lng) : null;
      const tooFar = passes && boarding === null;
      const approachingBus = boarding ? findApproachingBus(buses, lc, boarding) : null;
      const eta = boarding && approachingBus ? calcEtaMinutes(approachingBus, boarding) : null;
      const dist = boarding ? haversine(userPos.lat, userPos.lng, boarding.lat, boarding.lng) : 0;
      return { lineColor: lc, passes, boarding, tooFar, approachingBus, eta, dist };
    });
  }, [destination, userPos, stops, buses, passingLines]);

  const transferRoutes = useMemo(() => {
    if (!destination || !userPos) return [];
    return findTransferRoutes(stops, buses, destination.id, userPos.lat, userPos.lng, routeMap.size > 0 ? routeMap : undefined);
  }, [destination, userPos, stops, buses, routeMap]);

  // Sync live bus ETAs into the tracking store while tracking is active
  useEffect(() => {
    if (!tracking.isTracking || !buses.length) return;
    const updatedRows = tracking.etaRows.map(row => {
      const boardingStop = tracking.boardingStops[row.lineColor];
      if (!boardingStop) return { ...row, eta: null };
      const approachingBus = findApproachingBus(buses, row.lineColor, boardingStop);
      const eta = approachingBus ? calcEtaMinutes(approachingBus, boardingStop) : null;
      return { ...row, eta };
    });
    tracking.setEtaRows(updatedRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buses, tracking.isTracking]);

  async function handleTrack() {
    if (!destination) return;
    const boardingStops = lineResults
      .filter(r => r.passes && r.boarding)
      .map(r => ({ lineColor: r.lineColor, stop: r.boarding! }));
    await tracking.startTracking(destination, boardingStops);
  }

  if (tracking.isTracking) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 14, gap: 10 }}>
        <View style={styles.trackingCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.pulseDot} />
            <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: '700', flex: 1 }}>กำลังติดตาม</Text>
            <TouchableOpacity onPress={tracking.stopTracking} style={styles.stopBtn}>
              <Text style={{ color: '#888', fontSize: 12 }}>⏹ หยุด</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
            🎯 {tracking.destinationStop?.name}
          </Text>
          {tracking.etaRows.map(row => (
            <View key={row.lineColor} style={styles.etaRow}>
              <View style={[styles.badge, { backgroundColor: row.color }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{row.lineColor}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{row.lineName}</Text>
                <Text style={{ color: '#888', fontSize: 10 }}>📍 {tracking.boardingStops?.[row.lineColor]?.name ?? '—'}</Text>
              </View>
              <Text style={{ color: row.color, fontSize: 21, fontWeight: '800' }}>
                {row.eta != null ? `~${row.eta}` : '—'}
              </Text>
              <Text style={{ color: '#888', fontSize: 10 }}> น.</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {destination && (
        <TouchableOpacity style={styles.backBtn} onPress={() => setDestination(null)}>
          <Text style={styles.backBtnText}>← กลับ</Text>
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {!destination && <Text style={styles.sectionTitle}>🎯 ฉันต้องการไปที่...</Text>}
        <TextInput
          style={styles.searchBox}
          placeholder="ค้นหาป้ายปลายทาง..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
        />

        {!destination ? (
          <FlatList
            data={filtered.slice(0, 50)}
            keyExtractor={s => s.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stopRow}
                onPress={() => { setDestination(item); setQuery(''); }}
              >
                <Text style={{ fontSize: 18 }}>🚏</Text>
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
              <Text style={{ color: '#888', fontSize: 12 }}>ปลายทางที่เลือก</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 }}>{destination.name}</Text>
                <TouchableOpacity onPress={() => setDestination(null)} style={styles.changeBtn}>
                  <Text style={{ color: '#888', fontSize: 12 }}>✕ เปลี่ยน</Text>
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
                  tooFar={r.tooFar}
                  busId={r.approachingBus?.imei_id ?? null}
                />
              ))}
              {transferRoutes.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 4 }]}>🔄 ต่อรถ</Text>
                  {transferRoutes.map((t, i) => (
                    <TransferCard
                      key={i}
                      firstLine={t.firstLine}
                      boardingStopName={t.boardingStop.name}
                      boardingDistM={t.boardingDistM}
                      transferStopName={t.transferStop.name}
                      secondLine={t.secondLine}
                      etaToBoarding={t.etaToBoarding}
                      firstBusId={t.firstBusId}
                    />
                  ))}
                </>
              )}
            </View>
            <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
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
  screen: { flex: 1, backgroundColor: '#0f0f1a', paddingTop: 0 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3a',
  },
  backBtnText: {
    color: '#a78bfa',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBox: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#3a3a6a',
    borderRadius: 12,
    padding: 13,
    color: '#fff',
    fontSize: 17,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    backgroundColor: '#1a1a2e',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 8,
  },
  stopName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  lineDot: { width: 9, height: 9, borderRadius: 5 },
  destSelected: {
    backgroundColor: '#1a1a2e',
    borderRadius: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    gap: 8,
  },
  changeBtn: {
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  trackBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 13,
    padding: 16,
    alignItems: 'center',
  },
  trackingCard: {
    backgroundColor: '#0f0f1a',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#a78bfa55',
    padding: 13,
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2ecc71' },
  stopBtn: {
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3a',
  },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
});
