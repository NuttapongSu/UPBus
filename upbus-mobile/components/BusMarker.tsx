import { useState, useEffect } from 'react';
import { Image, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

const BUS_IMAGES: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base.png'),
  Red:    require('../assets/images/bus-red-base.png'),
  Blue:   require('../assets/images/bus-blue-base.png'),
  Purple: require('../assets/images/bus-purple-base-2.png'),
};

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  bearing?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export default function BusMarker({ busId, lat, lng, color, bearing = 0, isSelected = false, onPress }: Props) {
  const imageSource = BUS_IMAGES[color] ?? BUS_IMAGES['Purple'];
  const busNum = String(parseInt(busId.replace('TC', ''), 10));
  // bearing 0–180 = going left on campus loop → flip image horizontally (matches web logic)
  const flipX = bearing <= 180 ? -1 : 1;

  // Start tracking view changes to ensure Android renders image before snapshotting.
  // Flip to false after first frame, then follow isSelected.
  const [tracksViews, setTracksViews] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracksViews(isSelected), 500);
    return () => clearTimeout(id);
  }, [isSelected]);

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracksViews}
      identifier={busId}
    >
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: isSelected ? 2.5 : 0,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image
          source={imageSource}
          style={{ width: 52, height: 52, transform: [{ scaleX: flipX }] }}
          resizeMode="contain"
        />
        <Text style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: '900',
        }}>
          {busNum}
        </Text>
      </View>
    </Marker>
  );
}
