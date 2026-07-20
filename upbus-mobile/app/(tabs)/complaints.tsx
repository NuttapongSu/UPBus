import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { postComplaint, getBuses, BusData } from '../../lib/api';

const TYPES = [
  { key: 'driver-service', label: 'คนขับ', icon: '👤' },
  { key: 'bus-condition',  label: 'สภาพรถ', icon: '🚌' },
  { key: 'system-wrong',  label: 'ระบบแอป', icon: '📱' },
  { key: 'other',         label: 'อื่น ๆ',   icon: '🔧' },
];

const SUBCATS: Record<string, string[]> = {
  'driver-service': ['พูดจาไม่สุภาพ', 'ขับรถเร็วเกินไป', 'ไม่หยุดรับผู้โดยสาร', 'ไม่รอผู้โดยสาร', 'อื่น ๆ'],
  'bus-condition':  ['รถสกปรก', 'แอร์ไม่เย็น', 'ที่นั่งชำรุด', 'เสียงดังผิดปกติ', 'อื่น ๆ'],
  'system-wrong':  ['แสดงตำแหน่งผิด', 'แอปค้าง/หยุดทำงาน', 'ข้อมูลไม่อัปเดต', 'แจ้งเตือนไม่ทำงาน', 'อื่น ๆ'],
  'other':         ['ความปลอดภัย', 'เวลาให้บริการ', 'จุดจอดรถ', 'อื่น ๆ'],
};

const COLOR_LABEL: Record<string, string> = { Green: 'เขียว', Red: 'แดง', Blue: 'น้ำเงิน', Purple: 'ม่วง' };
const COLOR_DOT: Record<string, string> = { Green: '#22c55e', Red: '#ef4444', Blue: '#3b82f6', Purple: '#a855f7' };

interface HistoryItem { type: string; busNumber: string; detail: string; date: string; status: 'pending' | 'resolved'; }

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'form' | 'history'>('form');
  const [type, setType] = useState('driver-service');
  const [busNumber, setBusNumber] = useState('');
  const [detail, setDetail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedSubcats, setSelectedSubcats] = useState<string[]>([]);
  const [busList, setBusList] = useState<BusData[]>([]);
  const [showBusPicker, setShowBusPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('complaints').then(v => { if (v) setHistory(JSON.parse(v)); });
    getBuses().then(buses => {
      setBusList(buses);
      if (buses.length > 0) setBusNumber(buses[0].imei_id);
    }).catch(() => {});
  }, []);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  function getBusNumericId(imeiId: string): string {
    const match = imeiId.match(/(\d+)$/);
    return match ? String(parseInt(match[1], 10)) : '1';
  }

  function getBusLabel(imeiId: string): string {
    const bus = busList.find(b => b.imei_id === imeiId);
    const match = imeiId.match(/TC(\d+)$/i);
    const num = match ? match[1].padStart(3, '0') : imeiId;
    const colorLabel = bus ? (COLOR_LABEL[bus.color] ?? bus.color) : '';
    return colorLabel ? `TC${num} · สาย${colorLabel}` : `TC${num}`;
  }

  async function handleSubmit() {
    const prefixParts = selectedSubcats.length > 0 ? selectedSubcats.join(', ') : '';
    const sep = prefixParts && detail.trim() ? ' — ' : '';
    const combinedDetail = prefixParts + sep + detail.trim();

    if (!combinedDetail && !photo) {
      Alert.alert('กรุณาระบุรายละเอียด เลือกประเภทปัญหา หรือแนบรูปภาพ');
      return;
    }

    if (!busNumber) {
      Alert.alert('กรุณาเลือกเลขรถ');
      return;
    }

    const form = new FormData();
    form.append('topic', type);
    form.append('bus_number', getBusNumericId(busNumber));
    form.append('detail', combinedDetail || '(แนบรูปภาพ)');
    if (photo) form.append('image', { uri: photo, name: 'photo.jpg', type: 'image/jpeg' } as any);

    try {
      await postComplaint(form);
      const item: HistoryItem = {
        type,
        busNumber: getBusLabel(busNumber) || busNumber,
        detail: combinedDetail || '(แนบรูปภาพ)',
        date: new Date().toISOString(),
        status: 'pending',
      };
      const updated = [item, ...history];
      setHistory(updated);
      await AsyncStorage.setItem('complaints', JSON.stringify(updated));
      setDetail(''); setPhoto(null); setSelectedSubcats([]);
      Alert.alert('ส่งเรียบร้อย', 'ขอบคุณที่แจ้งปัญหา');
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', String(e?.message ?? e));
    }
  }

  function toggleSubcat(label: string) {
    setSelectedSubcats(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  }

  const selectedBusLabel = busNumber ? getBusLabel(busNumber) : 'เลือกรถ...';

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f1a', paddingTop: insets.top }}>
      <View style={styles.toggle}>
        {(['form', 'history'] as const).map(v => (
          <TouchableOpacity key={v} style={[styles.toggleBtn, view === v && styles.toggleActive]} onPress={() => setView(v)}>
            <Text style={{ color: view === v ? '#a78bfa' : '#555', fontSize: 14, fontWeight: '600' }}>
              {v === 'form' ? 'แจ้งปัญหา' : 'ประวัติ'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'form' ? (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          <Text style={styles.label}>ประเภทปัญหา</Text>
          <View style={styles.typeGrid}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.typeCard, type === t.key && styles.typeCardSel]}
                onPress={() => { setType(t.key); setSelectedSubcats([]); }}>
                <Text style={{ fontSize: 26 }}>{t.icon}</Text>
                <Text style={[styles.typeLabel, type === t.key && { color: '#a78bfa' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.subcatPanel}>
            <Text style={styles.subcatHeader}>
              {TYPES.find(t => t.key === type)?.icon}{' '}
              {TYPES.find(t => t.key === type)?.label} — เลือกรายละเอียด
            </Text>
            {SUBCATS[type].map(label => {
              const checked = selectedSubcats.includes(label);
              return (
                <TouchableOpacity key={label} style={styles.subcatRow} onPress={() => toggleSubcat(label)}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={[styles.subcatLabel, checked && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bus number dropdown */}
          <Text style={styles.label}>เลขรถ</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowBusPicker(true)}>
            <Text style={{ color: busNumber ? '#fff' : '#555', fontSize: 15, flex: 1 }}>
              {selectedBusLabel}
            </Text>
            <Text style={{ color: '#a78bfa', fontSize: 18 }}>▾</Text>
          </TouchableOpacity>

          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput
            style={styles.textarea}
            placeholder="พิมพ์รายละเอียดเพิ่มเติม..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
            value={detail}
            onChangeText={setDetail}
          />

          <Text style={styles.label}>แนบรูปภาพ (ถ้ามี)</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            {photo && (
              <View style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.photoDelete} onPress={() => setPhoto(null)}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {!photo && (
              <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                <Text style={{ color: '#555', fontSize: 24 }}>＋</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>ส่งเรื่องร้องเรียน</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
          {history.length === 0 ? (
            <Text style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>ยังไม่มีประวัติ</Text>
          ) : history.map((h, i) => (
            <View key={i} style={styles.histCard}>
              <Text style={{ fontSize: 21 }}>{TYPES.find(t => t.key === h.type)?.icon ?? '📋'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                  {TYPES.find(t => t.key === h.type)?.label} · {h.busNumber}
                </Text>
                <Text style={{ color: '#888', fontSize: 12 }} numberOfLines={1}>{h.detail}</Text>
              </View>
              <View style={[styles.statusBadge, h.status === 'resolved' ? styles.resolved : styles.pending]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: h.status === 'resolved' ? '#2ecc71' : '#f59e0b' }}>
                  {h.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bus picker modal */}
      <Modal visible={showBusPicker} transparent animationType="slide" onRequestClose={() => setShowBusPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBusPicker(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกเลขรถ</Text>
            {busList.length === 0 ? (
              <Text style={{ color: '#555', textAlign: 'center', padding: 20 }}>ไม่พบข้อมูลรถ</Text>
            ) : (
              <FlatList
                data={busList}
                keyExtractor={b => b.imei_id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => {
                  const label = getBusLabel(item.imei_id);
                  const selected = busNumber === item.imei_id;
                  const dot = COLOR_DOT[item.color] ?? '#888';
                  return (
                    <TouchableOpacity
                      style={[styles.busOption, selected && styles.busOptionSel]}
                      onPress={() => { setBusNumber(item.imei_id); setShowBusPicker(false); }}
                    >
                      <View style={[styles.colorDot, { backgroundColor: dot }]} />
                      <Text style={{ color: selected ? '#a78bfa' : '#ccc', fontSize: 15, flex: 1 }}>{label}</Text>
                      {selected && <Text style={{ color: '#a78bfa', fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: '#0a0a14', borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  toggleBtn: { flex: 1, padding: 16, alignItems: 'center' },
  toggleActive: { borderBottomWidth: 2, borderBottomColor: '#a78bfa' },
  label: { color: '#888', fontSize: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 13, padding: 13, alignItems: 'center', width: '47%', gap: 5 },
  typeCardSel: { borderColor: '#a78bfa', backgroundColor: '#a78bfa11' },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#888' },
  dropdown: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textarea: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 12, padding: 13, color: '#fff', minHeight: 104, textAlignVertical: 'top' },
  photoWrapper: { position: 'relative' },
  photoPreview: { width: 78, height: 78, borderRadius: 10 },
  photoDelete: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: { width: 78, height: 78, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#3a3a5e', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  submitBtn: { backgroundColor: '#7c3aed', borderRadius: 13, padding: 18, alignItems: 'center' },
  histCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#1a1a2e', borderRadius: 13, padding: 13, borderWidth: 1, borderColor: '#2a2a4a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  resolved: { backgroundColor: '#2ecc7122', borderColor: '#2ecc7144' },
  pending: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b44' },
  subcatPanel: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 13, padding: 13, gap: 8 },
  subcatHeader: { color: '#a78bfa', fontSize: 14, fontWeight: '700', marginBottom: 5 },
  subcatRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8 },
  checkbox: { width: 23, height: 23, borderWidth: 1.5, borderColor: '#3a3a5e', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  subcatLabel: { color: '#888', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 34 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#3a3a5e', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  busOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  busOptionSel: { backgroundColor: '#a78bfa11' },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
});
