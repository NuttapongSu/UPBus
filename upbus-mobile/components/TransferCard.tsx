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
  firstLine: string;
  boardingStopName: string;
  boardingDistM: number;
  transferStopName: string;
  secondLine: string;
  etaToBoarding: number | null;
  firstBusId: string | null;
}

export default function TransferCard({
  firstLine,
  boardingStopName,
  boardingDistM,
  transferStopName,
  secondLine,
  etaToBoarding,
  firstBusId,
}: Props) {
  const c1 = LINE_COLORS[firstLine] ?? '#888';
  const c2 = LINE_COLORS[secondLine] ?? '#888';

  return (
    <View style={[styles.card, { borderColor: c1 + '66' }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: c1 }]}>
          <Text style={styles.badgeText}>{firstLine}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.badge, { backgroundColor: c2 }]}>
          <Text style={styles.badgeText}>{secondLine}</Text>
        </View>
        <Text style={styles.transferLabel}>ต่อรถ</Text>
        {etaToBoarding != null
          ? <Text style={[styles.eta, { color: c1 }]}>~{etaToBoarding} น.</Text>
          : <Text style={styles.nope}>ไม่มีรถวิ่ง</Text>
        }
      </View>

      <View style={styles.step}>
        <Text style={styles.stepNum}>①</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepLabel}>{LINE_NAMES[firstLine] ?? firstLine}</Text>
          <Text style={styles.stepSub}>📍 ขึ้นที่ {boardingStopName} ({Math.round(boardingDistM)} ม.)</Text>
        </View>
        {firstBusId && <Text style={[styles.busId, { color: c1 }]}>{firstBusId}</Text>}
      </View>

      <View style={styles.step}>
        <Text style={styles.stepNum}>②</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepLabel}>{LINE_NAMES[secondLine] ?? secondLine}</Text>
          <Text style={styles.stepSub}>🔄 เปลี่ยนที่ {transferStopName}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 13,
    padding: 13,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    color: '#888',
    fontSize: 12,
  },
  transferLabel: {
    flex: 1,
    color: '#aaa',
    fontSize: 12,
  },
  eta: {
    fontSize: 18,
    fontWeight: '800',
  },
  nope: {
    color: '#555',
    fontSize: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ffffff0a',
    borderRadius: 8,
    padding: 8,
  },
  stepNum: {
    color: '#888',
    fontSize: 14,
  },
  stepLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  stepSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  busId: {
    fontSize: 14,
    fontWeight: '800',
  },
});
