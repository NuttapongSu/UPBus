import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Image, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

// Android-specific BusMarker: tracksViewChanges stays true permanently.
// Toggling tracksViewChanges true→false triggers a Fabric (New Architecture)
// crash where mountChildComponentView receives a nil view reference.
// Performance trade-off (always live-updating snapshot) is acceptable vs. crashing.

const BUS_IMAGES_NORMAL: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base.png'),
  Red:    require('../assets/images/bus-red-base.png'),
  Blue:   require('../assets/images/bus-blue-base.png'),
  Purple: require('../assets/images/bus-purple-base-2.png'),
  Orange: require('../assets/images/bus-orange-base.png'),
};

// Pre-flipped assets for Android — scaleX:-1 is unreliable inside Marker snapshots
const BUS_IMAGES_FLIP: Record<string, any> = {
  Green:  require('../assets/images/bus-green-base-flip.png'),
  Red:    require('../assets/images/bus-red-base-flip.png'),
  Blue:   require('../assets/images/bus-blue-base-flip.png'),
  Purple: require('../assets/images/bus-purple-base-flip.png'),
  Orange: require('../assets/images/bus-orange-base-flip.png'),
};

export interface BusMarkerHandle {
  moveTo(lat: number, lng: number): void;
  setBearing(bearing: number): void;
}

const shortDept = (s: string) => (s.length > 14 ? s.slice(0, 13) + '…' : s);

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  department?: string | null;
  bearing?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

const BusMarker = forwardRef<BusMarkerHandle, Props>(function BusMarker(
  { busId, lat, lng, color, department, bearing = 0, isSelected = false, onPress },
  ref,
) {
  const busNum = String(parseInt(busId.replace('TC', ''), 10));
  const deptLabel = color === 'Orange' ? (department ? shortDept(department) : 'นอกเส้นทาง') : null;

  const markerRef = useRef<any>(null);
  const [flip, setFlip] = useState<1 | -1>(bearing <= 180 ? -1 : 1);
  const flipRef = useRef<1 | -1>(flip);

  const imageSource = flip === -1
    ? (BUS_IMAGES_NORMAL[color] ?? BUS_IMAGES_NORMAL['Purple'])
    : (BUS_IMAGES_FLIP[color] ?? BUS_IMAGES_FLIP['Purple']);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useImperativeHandle(ref, () => ({
    moveTo(newLat: number, newLng: number) {
      markerRef.current?.animateMarkerToCoordinate(
        { latitude: newLat, longitude: newLng },
        0,
      );
    },
    setBearing(newBearing: number) {
      const newFlip: 1 | -1 = newBearing <= 180 ? -1 : 1;
      if (newFlip !== flipRef.current && mountedRef.current) {
        flipRef.current = newFlip;
        setFlip(newFlip);
      }
    },
  }));

  return (
    <Marker
      ref={markerRef}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges
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
          style={{ width: 62, height: 62 }}
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
        {deptLabel && (
          <View style={{
            position: 'absolute',
            top: -22,
            alignSelf: 'center',
            maxWidth: 140,
            backgroundColor: 'rgba(230,126,34,0.92)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              🟠 {deptLabel}
            </Text>
          </View>
        )}
      </View>
    </Marker>
  );
});

export default BusMarker;
