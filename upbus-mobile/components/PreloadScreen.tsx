import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { mutate } from 'swr';
import { getBuses, BusData } from '../lib/api';
import { parseAllKml } from '../lib/kmlParser';
import { runPreload } from '../lib/preloadGate';

const MASCOT_IMAGE = require('../assets/images/nongcabon.png');

interface Props {
  onReady: (result: { slowLoad: boolean }) => void;
}

export default function PreloadScreen({ onReady }: Props) {
  const [statusText, setStatusText] = useState('กำลังโหลดเส้นทาง...');
  const barWidth = useRef(new Animated.Value(0)).current;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    runPreload<BusData[]>({
      loadRoutes: () => { parseAllKml(); },
      loadBuses: () => getBuses(),
      onProgress: (pct) => {
        setStatusText(pct === 30 ? 'กำลังโหลดเส้นทาง...' : 'กำลังโหลดข้อมูลรถ...');
        Animated.timing(barWidth, {
          toValue: pct,
          duration: 300,
          useNativeDriver: false,
        }).start();
      },
    }).then(({ buses, slowLoad }) => {
      if (buses) mutate('/api/buses', buses, false);
      onReady({ slowLoad });
    });
  }, [barWidth, onReady]);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>ยินดีต้อนรับสู่</Text>
        <Text style={styles.bubbleTextBold}>UP SMART TRANSIT</Text>
        <Text style={styles.bubbleText}>BY UP-CESM</Text>
        <View style={styles.bubbleTail} />
      </View>
      <Image source={MASCOT_IMAGE} style={styles.mascot} resizeMode="contain" />
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
    alignItems: 'center',
  },
  bubbleText: {
    color: '#1a1a2e',
    fontSize: 14,
  },
  bubbleTextBold: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '900',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  mascot: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  barTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e1e3a',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  statusText: {
    marginTop: 10,
    color: '#a78bfa',
    fontSize: 13,
  },
});
