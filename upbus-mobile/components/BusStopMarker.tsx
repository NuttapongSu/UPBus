import { Image, View, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Stop } from '@/constants/stops';

const STOP_IMG = require('@/assets/images/bus-stop.png');

export default function BusStopMarker({ stop, color }: { stop: Stop; color: string }) {
  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      title={stop.name}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
    >
      <View style={[s.wrapper, { borderColor: color }]}>
        <Image source={STOP_IMG} style={s.img} resizeMode="contain" />
      </View>
    </Marker>
  );
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2.5,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  img: { width: 28, height: 28 },
});
