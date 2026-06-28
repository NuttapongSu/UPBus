import { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BusData } from '../lib/api';

const LINE_LABELS: Record<string, string> = {
  Green: 'หน้ามอ',
  Blue:  'ประตู3',
  Red:   'หอพัก',
  Purple: '-',
};
const LINE_COLORS: Record<string, string> = {
  Green:  '#2ecc71',
  Blue:   '#3498db',
  Red:    '#e74c3c',
  Purple: '#9b59b6',
};

function parseDateThai(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const ms = new Date(dateStr.replace(' ', 'T') + '+07:00').getTime();
    if (isNaN(ms)) return '-';
    return new Date(ms).toLocaleTimeString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
}

export default function BusDetailSheet({ bus, onClose }: { bus: BusData | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(300)).current;
  const isShown = useRef(false);

  useEffect(() => {
    if (bus) {
      isShown.current = true;
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideY, { toValue: 300, duration: 180, useNativeDriver: true }).start(() => {
        isShown.current = false;
      });
    }
  }, [bus, slideY]);

  if (!bus && !isShown.current) return null;

  const busNum  = bus ? String(parseInt(bus.imei_id.replace('TC', ''), 10)) : '';
  const label   = bus ? (LINE_LABELS[bus.color] ?? bus.color) : '';
  const dot     = bus ? (LINE_COLORS[bus.color] ?? '#9b59b6') : '#9b59b6';
  const accText = bus?.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
  const time    = bus ? parseDateThai(bus.date) : '-';

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 12 }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.busNum}>รถ TC{busNum}</Text>
        <Text style={styles.lineLabel}>สาย: {label}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Detail rows */}
      <Text style={styles.row}>คนขับ: {bus?.driver || '-'}</Text>
      <View style={styles.rowGroup}>
        <Text style={styles.row}>ความเร็ว: {bus?.speed ?? 0} km/h</Text>
        <Text style={[styles.row, { marginLeft: 20 }]}>SOC: {bus?.soc ?? '-'}%</Text>
      </View>
      <Text style={styles.row}>สถานะ: {accText}</Text>
      <Text style={styles.row}>อัปเดต: {time}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,15,26,0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  busNum: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  lineLabel: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#aaa',
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    color: '#ddd',
    fontSize: 13,
    marginBottom: 5,
  },
  rowGroup: {
    flexDirection: 'row',
  },
});
