import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Image, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

const BUS_IMAGES: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base.png'),
  Red:    require('../assets/images/bus-red-base.png'),
  Blue:   require('../assets/images/bus-blue-base.png'),
  Purple: require('../assets/images/bus-purple-base-2.png'),
};

export interface BusMarkerHandle {
  moveTo(lat: number, lng: number): void;
  setBearing(bearing: number): void;
}

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  bearing?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

const BusMarker = forwardRef<BusMarkerHandle, Props>(function BusMarker(
  { busId, lat, lng, color, bearing = 0, isSelected = false, onPress },
  ref,
) {
  const imageSource = BUS_IMAGES[color] ?? BUS_IMAGES['Purple'];
  const busNum = String(parseInt(busId.replace('TC', ''), 10));

  const markerRef = useRef<any>(null);
  const [flip, setFlip] = useState<1 | -1>(bearing <= 180 ? -1 : 1);
  const flipRef = useRef<1 | -1>(flip);

  const [tracksViews, setTracksViews] = useState(true);
  const tracksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setTracksViews(isSelected), 500);
    return () => clearTimeout(id);
  }, [isSelected]);

  useImperativeHandle(ref, () => ({
    moveTo(newLat: number, newLng: number) {
      markerRef.current?.animateMarkerToCoordinate(
        { latitude: newLat, longitude: newLng },
        0,
      );
    },
    setBearing(newBearing: number) {
      const newFlip: 1 | -1 = newBearing <= 180 ? -1 : 1;
      if (newFlip !== flipRef.current) {
        flipRef.current = newFlip;
        setFlip(newFlip);
        // Briefly re-enable tracksViewChanges so the snapshot updates
        if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
        setTracksViews(true);
        tracksTimerRef.current = setTimeout(() => {
          setTracksViews(isSelected);
          tracksTimerRef.current = null;
        }, 300);
      }
    },
  }));

  return (
    <Marker
      ref={markerRef}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracksViews}
      identifier={busId}
    >
      <View style={{
        width: 67,
        height: 67,
        borderRadius: 34,
        borderWidth: isSelected ? 2.5 : 0,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image
          source={imageSource}
          style={{ width: 62, height: 62, transform: [{ scaleX: flip }] }}
          resizeMode="contain"
        />
        <Text style={{
          position: 'absolute',
          top: 14,
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
});

export default BusMarker;
