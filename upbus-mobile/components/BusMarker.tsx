import { Image } from 'react-native';
import { Marker } from 'react-native-maps';

const BUS_IMAGES: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base.png'),
  Red:    require('../assets/images/bus-red-base.png'),
  Blue:   require('../assets/images/bus-blue-base.png'),
  Purple: require('../assets/images/bus-purple-base.png'),
};

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  onPress?: () => void;
}

export default function BusMarker({ busId, lat, lng, color, onPress }: Props) {
  const imageSource = BUS_IMAGES[color] ?? BUS_IMAGES['Purple'];
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={false}
      identifier={busId}
    >
      <Image source={imageSource} style={{ width: 40, height: 40 }} resizeMode="contain" />
    </Marker>
  );
}
