import { Text, View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Stop } from '@/constants/stops';

export default function BusStopMarker({ stop, color }: { stop: Stop; color: string }) {
  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      title={stop.name}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={s.container}>
        <View style={[s.bubble, { borderColor: color }]}>
          <Text style={s.icon}>🚏</Text>
        </View>
        <View style={[s.triangle, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    padding: 3,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  icon: { fontSize: 14 },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
