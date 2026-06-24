// upbus-mobile/components/BusStopMarker.tsx
import { Marker } from 'react-native-maps';
import { Stop } from '@/constants/stops';

export default function BusStopMarker({ stop, color }: { stop: Stop; color: string }) {
  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      title={stop.name}
      pinColor={color}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  );
}
