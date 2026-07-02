import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { postComplaint } from '../../lib/api';

const TYPES = [
  { key: 'driver-service', label: 'คนขับ', icon: '👤' },
  { key: 'bus-condition',  label: 'สภาพรถ', icon: '🚌' },
  { key: 'system-wrong',  label: 'ระบบแอป', icon: '📱' },
  { key: 'other',         label: 'อื่น ๆ',   icon: '🔧' },
];
const LINES = ['Green', 'Red', 'Blue'];

const SUBCATS: Record<string, string[]> = {
  'driver-service': ['พูดจาไม่สุภาพ', 'ขับรถเร็วเกินไป', 'ไม่หยุดรับผู้โดยสาร', 'ไม่รอผู้โดยสาร', 'อื่น ๆ'],
  'bus-condition':  ['รถสกปรก', 'แอร์ไม่เย็น', 'ที่นั่งชำรุด', 'เสียงดังผิดปกติ', 'อื่น ๆ'],
  'system-wrong':  ['แสดงตำแหน่งผิด', 'แอปค้าง/หยุดทำงาน', 'ข้อมูลไม่อัปเดต', 'แจ้งเตือนไม่ทำงาน', 'อื่น ๆ'],
  'other':         ['ความปลอดภัย', 'เวลาให้บริการ', 'จุดจอดรถ', 'อื่น ๆ'],
};

interface HistoryItem { type: string; line: string; detail: string; date: string; status: 'pending' | 'resolved'; }

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'form' | 'history'>('form');
  const [type, setType] = useState('driver-service');
  const [line, setLine] = useState('Green');
  const [detail, setDetail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedSubcats, setSelectedSubcats] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('complaints').then(v => { if (v) setHistory(JSON.parse(v)); });
  }, []);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  const LINE_BUS_NUMBER: Record<string, string> = { Green: '1', Red: '2', Blue: '3' };

  async function handleSubmit() {
    if (!detail.trim() && selectedSubcats.length === 0) {
      Alert.alert('กรุณาระบุรายละเอียดหรือเลือกประเภทปัญหา');
      return;
    }
    const form = new FormData();
    form.append('topic', type);
    form.append('bus_number', LINE_BUS_NUMBER[line] ?? '1');
    const prefix = selectedSubcats.length > 0 ? selectedSubcats.join(', ') + (detail.trim() ? ' — ' : '') : '';
    form.append('detail', prefix + detail);
    if (photo) form.append('image', { uri: photo, name: 'photo.jpg', type: 'image/jpeg' } as any);
    try {
      await postComplaint(form);
      const item: HistoryItem = { type, line, detail, date: new Date().toISOString(), status: 'pending' };
      const updated = [item, ...history];
      setHistory(updated);
      await AsyncStorage.setItem('complaints', JSON.stringify(updated));
      setDetail(''); setPhoto(null); setSelectedSubcats([]);
      Alert.alert('ส่งเรียบร้อย', 'ขอบคุณที่แจ้งปัญหา');
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งเรื่องร้องเรียนได้ กรุณาลองใหม่');
    }
  }

  function toggleSubcat(label: string) {
    setSelectedSubcats(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f1a', paddingTop: insets.top }}>
      <View style={styles.toggle}>
        {(['form', 'history'] as const).map(v => (
          <TouchableOpacity key={v} style={[styles.toggleBtn, view === v && styles.toggleActive]} onPress={() => setView(v)}>
            <Text style={{ color: view === v ? '#a78bfa' : '#555', fontSize: 11, fontWeight: '600' }}>
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
                <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                <Text style={[styles.typeLabel, type === t.key && { color: '#a78bfa' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sub-category expansion */}
          <View style={styles.subcatPanel}>
            <Text style={styles.subcatHeader}>
              {TYPES.find(t => t.key === type)?.icon}{' '}
              {TYPES.find(t => t.key === type)?.label} — เลือกรายละเอียด
            </Text>
            {SUBCATS[type].map(label => {
              const checked = selectedSubcats.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={styles.subcatRow}
                  onPress={() => toggleSubcat(label)}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={[styles.subcatLabel, checked && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>รถสาย</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LINES.map(l => (
              <TouchableOpacity key={l} style={[styles.lineBtn, line === l && styles.lineBtnSel]}
                onPress={() => setLine(l)}>
                <Text style={{ color: line === l ? '#fff' : '#888', fontSize: 11, fontWeight: '600' }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {photo && <Image source={{ uri: photo }} style={styles.photoPreview} />}
            <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
              <Text style={{ color: '#555', fontSize: 24 }}>＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>ส่งเรื่องร้องเรียน</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
          {history.length === 0 ? (
            <Text style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>ยังไม่มีประวัติ</Text>
          ) : history.map((h, i) => (
            <View key={i} style={styles.histCard}>
              <Text style={{ fontSize: 16 }}>{TYPES.find(t => t.key === h.type)?.icon ?? '📋'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                  {TYPES.find(t => t.key === h.type)?.label} · {h.line}
                </Text>
                <Text style={{ color: '#888', fontSize: 9 }} numberOfLines={1}>{h.detail}</Text>
              </View>
              <View style={[styles.statusBadge, h.status === 'resolved' ? styles.resolved : styles.pending]}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: h.status === 'resolved' ? '#2ecc71' : '#f59e0b' }}>
                  {h.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: '#0a0a14', borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center' },
  toggleActive: { borderBottomWidth: 2, borderBottomColor: '#a78bfa' },
  label: { color: '#888', fontSize: 11 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, padding: 10, alignItems: 'center', width: '47%', gap: 4 },
  typeCardSel: { borderColor: '#a78bfa', backgroundColor: '#a78bfa11' },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#888' },
  lineBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  lineBtnSel: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  textarea: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 9, padding: 10, color: '#fff', minHeight: 80, textAlignVertical: 'top' },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
  photoAdd: { width: 60, height: 60, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#3a3a5e', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  submitBtn: { backgroundColor: '#7c3aed', borderRadius: 10, padding: 14, alignItems: 'center' },
  histCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  resolved: { backgroundColor: '#2ecc7122', borderColor: '#2ecc7144' },
  pending: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b44' },
  subcatPanel: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  subcatHeader: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  subcatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#3a3a5e',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  subcatLabel: {
    color: '#888',
    fontSize: 12,
  },
});
