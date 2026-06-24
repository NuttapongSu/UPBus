import { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';
import { BusData, BusColor } from '@/lib/api';

const COLOR_HEX: Record<BusColor, string> = {
  Red: '#e74c3c', Green: '#2ecc71', Blue: '#3498db',
  Purple: '#9b59b6', Orange: '#e67e22', Yellow: '#f1c40f', White: '#bdc3c7',
};

export default function BusMarker({ bus }: { bus: BusData }) {
  if (!bus.latitude || !bus.longitude) return null;

  const coordinate = useRef(
    new AnimatedRegion({
      latitude: bus.latitude,
      longitude: bus.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  useEffect(() => {
    coordinate.timing({
      latitude: bus.latitude!,
      longitude: bus.longitude!,
      latitudeDelta: 0,
      longitudeDelta: 0,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [bus.latitude, bus.longitude]);

  const color = COLOR_HEX[bus.color] ?? '#9b59b6';

  return (
    <Marker.Animated
      coordinate={coordinate}
      title={bus.imei_id}
      description={`สาย: ${bus.color} | ${bus.driver}`}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[s.bubble, { backgroundColor: color }]}>
        <Text style={s.icon}>🚌</Text>
      </View>
      <View style={[s.triangle, { borderTopColor: color }]} />
    </Marker.Animated>
  );
}

const s = StyleSheet.create({
  bubble: {
    borderRadius: 20,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  icon: { fontSize: 18 },
  triangle: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
