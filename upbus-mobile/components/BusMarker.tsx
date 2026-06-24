// upbus-mobile/components/BusMarker.tsx
import { Marker } from 'react-native-maps';
import { BusData, BusColor } from '@/lib/api';

const COLOR_HEX: Record<BusColor, string> = {
  Red: '#e74c3c', Green: '#2ecc71', Blue: '#3498db',
  Purple: '#9b59b6', Orange: '#e67e22', Yellow: '#f1c40f', White: '#bdc3c7',
};

export default function BusMarker({ bus }: { bus: BusData }) {
  if (!bus.latitude || !bus.longitude) return null;
  return (
    <Marker
      coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
      title={bus.imei_id}
      description={`สาย: ${bus.color} | ${bus.driver}`}
      pinColor={COLOR_HEX[bus.color] ?? '#9b59b6'}
    />
  );
}
