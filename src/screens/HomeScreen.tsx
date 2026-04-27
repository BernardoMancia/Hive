import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { RootStackParamList, ChatRoom } from '../types';
import { ROOMS } from '../config/rooms';
import {
  subscribeToPresence,
  isAgeVerified,
  setCurrentRoom,
  getUserName,
  setUserName,
  initPresence,
  getUserId,
} from '../services/presence';
import { resetGun, subscribeToAdminRooms } from '../services/gun';
import type { AdminRoom } from '../services/gun';
import { useConnectionStatus } from '../services/connection';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [displayRooms, setDisplayRooms] = useState<ChatRoom[]>(ROOMS);

  const isMounted = useRef(true);
  const unsubPresence = useRef<(() => void) | null>(null);
  const unsubRooms = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const { status: connStatus, reconnect } = useConnectionStatus();

  useEffect(() => {
    isMounted.current = true;
    setCurrentRoom('lobby');
    loadUserName();
    attachPresence();
    attachAdminRooms();
    return () => {
      isMounted.current = false;
      unsubPresence.current?.();
      unsubRooms.current?.();
    };
  }, []);

  const loadUserName = async () => {
    const name = await getUserName();
    if (name && isMounted.current) setCurrentName(name);
  };

  const attachAdminRooms = () => {
    unsubRooms.current?.();
    let resolved = false;

    const fallbackTimer = setTimeout(() => {
      if (!isMounted.current || resolved) return;
      setDisplayRooms(ROOMS);
    }, 3000);

    const unsub = subscribeToAdminRooms((adminRooms: AdminRoom[]) => {
      if (!isMounted.current) return;
      clearTimeout(fallbackTimer);
      resolved = true;
      if (adminRooms.length === 0) {
        setDisplayRooms(ROOMS);
        return;
      }
      const mapped: ChatRoom[] = adminRooms.map((ar) => {
        const existing = ROOMS.find(r => r.id === ar.id);
        return {
          id: ar.id,
          name: ar.name,
          description: ar.desc || existing?.description || '',
          icon: ar.icon || existing?.icon || '💬',
          isAdult: existing?.isAdult ?? false,
          color: existing?.color || '#00d4ff',
        };
      });
      setDisplayRooms(mapped);
    });
    unsubRooms.current = unsub;
  };

  const attachPresence = () => {
    unsubPresence.current?.();
    const unsub = subscribeToPresence((count, counts) => {
      if (!isMounted.current) return;
      setOnlineCount(count);
      setRoomCounts(counts);
    });
    unsubPresence.current = unsub;
  };

  const onRefresh = useCallback(async () => {
    if (!isMounted.current) return;
    setRefreshing(true);
    try {
      unsubPresence.current?.();
      unsubRooms.current?.();
      resetGun();
      const [userId, name] = await Promise.all([getUserId(), getUserName()]);
      if (name && isMounted.current) await initPresence(userId, name);
      if (isMounted.current) { attachPresence(); attachAdminRooms(); }
    } catch (_) {}
    if (isMounted.current) setTimeout(() => { if (isMounted.current) setRefreshing(false); }, 800);
  }, []);

  const handleRoomPress = async (room: ChatRoom) => {
    if (room.isAdult) {
      const verified = await isAgeVerified();
      if (!verified) { navigation.navigate('AgeVerification', { room }); return; }
    }
    navigation.navigate('Chat', { room });
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) { Alert.alert('Nome inválido', 'Mínimo 2 caracteres.'); return; }
    if (trimmed.length > 20) { Alert.alert('Nome inválido', 'Máximo 20 caracteres.'); return; }
    setSavingName(true);
    try {
      await setUserName(trimmed);
      const userId = await getUserId();
      await initPresence(userId, trimmed);
      if (isMounted.current) { setCurrentName(trimmed); setShowNameModal(false); }
    } catch (_) {
      if (isMounted.current) Alert.alert('Erro', 'Tente novamente.');
    } finally {
      if (isMounted.current) setSavingName(false);
    }
  };

  const isConnected = connStatus === 'connected';

  const renderRoom = ({ item: room }: { item: ChatRoom }) => {
    const count = roomCounts[room.id] || 0;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleRoomPress(room)}
        activeOpacity={0.8}
      >
        <View style={[s.cardAccent, { backgroundColor: room.color + '22' }]} />
        <View style={[s.cardIconWrap, { backgroundColor: room.color + '22', borderColor: room.color + '44' }]}>
          <Text style={s.cardIcon}>{room.icon}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardName}>{room.name}</Text>
          <Text style={s.cardDesc} numberOfLines={1}>{room.description}</Text>
        </View>
        <View style={s.cardRight}>
          {count > 0 && (
            <View style={s.cardBadge}>
              <View style={s.cardDot} />
              <Text style={s.cardCount}>{count}</Text>
            </View>
          )}
          <Text style={s.cardArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.logo}>🐝</Text>
          <View>
            <Text style={s.title}>Hive</Text>
            <Text style={s.subtitle}>Chat P2P cifrado</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={[s.connDot, { backgroundColor: isConnected ? Colors.green : Colors.red }]} />
          <View style={s.onlinePill}>
            <Text style={s.onlineText}>{onlineCount} online</Text>
          </View>
        </View>
      </View>

      {!isConnected && (
        <TouchableOpacity style={s.banner} onPress={reconnect}>
          <Text style={s.bannerText}>⚠ Sem conexão — toque para reconectar</Text>
        </TouchableOpacity>
      )}

      <View style={s.subHeader}>
        <Text style={s.subTitle}>Canais</Text>
        <TouchableOpacity style={s.nameChip} onPress={() => { setNewName(currentName); setShowNameModal(true); }}>
          <Text style={s.nameText} numberOfLines={1}>👤 {currentName || '...'}</Text>
          <Text style={s.nameEdit}> ✎</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayRooms}
        keyExtractor={r => r.id}
        renderItem={renderRoom}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.neon} colors={[Colors.neon]} />
        }
        ListFooterComponent={
          <View style={s.footer}>
            <Text style={s.footerText}>⬡ P2P · zero dados · TTL 1h</Text>
            <Text style={s.footerVersion}>v3.1.0-beta</Text>
          </View>
        }
      />

      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNameModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>Alterar nome</Text>
            <Text style={s.modalSub}>Como os outros peers te verão</Text>
            <TextInput
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Seu nome..."
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowNameModal(false)}>
                <Text style={s.modalCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSave, (newName.trim().length < 2 || savingName) && s.modalSaveDisabled]}
                onPress={handleSaveName}
                disabled={newName.trim().length < 2 || savingName}
              >
                {savingName ? <ActivityIndicator size="small" color={Colors.bg} /> : <Text style={s.modalSaveTxt}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { fontSize: 30 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.neon, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  onlinePill: {
    backgroundColor: Colors.glassLight, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  onlineText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  banner: {
    backgroundColor: Colors.yellowDim, borderBottomWidth: 1, borderBottomColor: Colors.yellowDim,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  bannerText: { fontSize: 13, color: Colors.yellow, fontWeight: '600', textAlign: 'center' },
  subHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  subTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  nameChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.neonDim, borderWidth: 1, borderColor: Colors.neonBorder,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  nameText: { fontSize: 13, color: Colors.neon, fontWeight: '600', maxWidth: 120 },
  nameEdit: { fontSize: 13, color: Colors.neon, opacity: 0.6 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, marginBottom: 10, padding: 14, overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3,
  },
  cardIconWrap: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: Colors.textMuted },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.greenDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  cardCount: { fontSize: 12, color: Colors.green, fontWeight: '700' },
  cardArrow: { fontSize: 22, color: Colors.textMuted, lineHeight: 26 },
  footer: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  footerText: { fontSize: 12, color: Colors.textMuted },
  footerVersion: { fontSize: 11, color: Colors.textMuted, opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modal: { width: '100%', backgroundColor: Colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  modalInput: {
    color: Colors.text, backgroundColor: Colors.glass, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: Colors.neonBorder, marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelTxt: { fontSize: 15, fontWeight: '600', color: Colors.textSub },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.neon, alignItems: 'center', justifyContent: 'center' },
  modalSaveDisabled: { opacity: 0.35 },
  modalSaveTxt: { fontSize: 15, fontWeight: '700', color: Colors.bg },
});
