import { View, Text, StyleSheet } from 'react-native';

const LINE_COLORS: Record<string, string> = {
  Green: '#2ecc71',
  Red:   '#e74c3c',
  Blue:  '#3498db',
};

const LINE_NAMES: Record<string, string> = {
  Green: 'สายหน้ามอ',
  Red:   'สายหอพัก',
  Blue:  'สายประตูสาม',
};

interface Props {
  lineColor: string;
  boardingStopName: string;
  distanceM: number;
  etaMinutes: number | null;
  passes: boolean;
  tooFar?: boolean;
  busId?: string | null;
}

export default function RouteResultCard({
  lineColor,
  boardingStopName,
  distanceM,
  etaMinutes,
  passes,
  tooFar,
  busId,
}: Props) {
  const color = LINE_COLORS[lineColor] ?? '#888';

  if (!passes) {
    return (
      <View style={[styles.card, { borderColor: '#2a2a4a', opacity: 0.4 }]}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{lineColor}</Text>
          </View>
          <Text style={styles.lineName}>{LINE_NAMES[lineColor] ?? lineColor}</Text>
          <Text style={styles.nope}>ไม่ผ่าน</Text>
        </View>
      </View>
    );
  }

  if (tooFar) {
    return (
      <View style={[styles.card, { borderColor: color + '44', opacity: 0.6 }]}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{lineColor}</Text>
          </View>
          <Text style={styles.lineName}>{LINE_NAMES[lineColor] ?? lineColor}</Text>
          <Text style={styles.nope}>สถานีไกลเกิน 500 ม.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: color + '88' }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{lineColor}</Text>
        </View>
        <Text style={styles.lineName}>{LINE_NAMES[lineColor] ?? lineColor}</Text>
        {etaMinutes != null
          ? <Text style={[styles.eta, { color }]}>~{etaMinutes} น.</Text>
          : <Text style={styles.nope}>ไม่มีรถวิ่ง</Text>
        }
      </View>

      <View style={styles.boarding}>
        <Text style={styles.boardingLabel}>📍 ไปรอที่</Text>
        <Text style={styles.boardingName}>{boardingStopName}</Text>
        <Text style={styles.boardingDist}>{Math.round(distanceM)} ม.</Text>
      </View>

      {busId && (
        <View style={styles.busRow}>
          <Text style={styles.busLabel}>🚌 รถ</Text>
          <Text style={[styles.busId, { color }]}>{busId}</Text>
          <Text style={styles.busLabel}>กำลังเข้าสถานี</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  lineName: {
    flex: 1,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  eta: {
    fontSize: 14,
    fontWeight: '800',
  },
  nope: {
    color: '#555',
    fontSize: 9,
  },
  boarding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff0a',
    borderRadius: 6,
    padding: 6,
  },
  boardingLabel: {
    fontSize: 9,
    color: '#888',
  },
  boardingName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  boardingDist: {
    fontSize: 9,
    color: '#888',
  },
  busRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  busLabel: {
    fontSize: 9,
    color: '#888',
  },
  busId: {
    fontSize: 11,
    fontWeight: '800',
  },
});
