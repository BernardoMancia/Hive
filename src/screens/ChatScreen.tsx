import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  TouchableOpacity,
  Keyboard,
  Platform,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { subscribeToMessages, sendMessage, subscribeToServerCtrl, ServerCtrl } from '../services/gun';
import { sendMediaMessage } from '../services/media';
import {
  getUserId,
  getUserName,
  setCurrentRoom,
  subscribeToPresence,
} from '../services/presence';
import { useConnectionStatus } from '../services/connection';

type MessageItem = {
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
  pending?: boolean;
  sent?: boolean;
  confirmed?: boolean;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ navigation, route }: Props) {
  const { room } = route.params;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [inputText, setInputText] = useState('');
  const [serverCtrl, setServerCtrl] = useState<ServerCtrl>({ maintenance: false, pauseMessaging: false });

  const isMounted = useRef(true);
  const seenIds = useRef(new Set<string>());
  const unsubMessages = useRef<(() => void) | null>(null);
  const unsubPresence = useRef<(() => void) | null>(null);
  const unsubCtrl = useRef<(() => void) | null>(null);
  const userIdRef = useRef('');
  const userNameRef = useRef('Anonymous');
  const flatListRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const { status: connStatus, reconnect } = useConnectionStatus();

  useEffect(() => {
    isMounted.current = true;
    initChat();
    const unsubC = subscribeToServerCtrl((ctrl) => {
      if (isMounted.current) setServerCtrl(ctrl);
    });
    unsubCtrl.current = unsubC;
    return () => {
      isMounted.current = false;
      unsubMessages.current?.();
      unsubPresence.current?.();
      unsubCtrl.current?.();
      setCurrentRoom(null);
    };
  }, []);

  const initChat = async () => {
    try {
      const [id, name] = await Promise.all([getUserId(), getUserName()]);
      if (!isMounted.current) return;
      userIdRef.current = id;
      userNameRef.current = name || 'Anonymous';
      setCurrentRoom(room.id);

      const unsubP = subscribeToPresence((_count, roomCounts) => {
        if (!isMounted.current) return;
        setPeerCount(roomCounts[room.id] || 0);
      });
      unsubPresence.current = unsubP;

      const unsubM = subscribeToMessages(
        room.id,
        (msg) => {
          if (!isMounted.current) return;
          if (seenIds.current.has(msg._id)) {
            setMessages(prev => prev.map(m =>
              m._id === msg._id ? { ...m, confirmed: true, pending: false, sent: true } : m
            ));
            return;
          }
          seenIds.current.add(msg._id);
          setMessages(prev => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [{ _id: msg._id, text: msg.text || '', createdAt: msg.createdAt, user: msg.user, image: msg.image }, ...prev];
          });
        },
        (deletedId) => {
          if (!isMounted.current) return;
          seenIds.current.delete(deletedId);
          setMessages(prev => prev.filter(m => m._id !== deletedId));
        }
      );
      unsubMessages.current = unsubM;
      if (isMounted.current) setIsReady(true);
    } catch (_) {
      if (isMounted.current) setIsReady(true);
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !userIdRef.current) return;
    if (serverCtrl.maintenance || serverCtrl.pauseMessaging) return;
    const uid = userIdRef.current;
    const uname = userNameRef.current;

    const tempId = `${uid}_${Date.now()}`;
    const ts = Date.now();
    setInputText('');

    const optimistic: MessageItem = { _id: tempId, text, createdAt: ts, user: { _id: uid, name: uname }, pending: true, sent: false, confirmed: false };
    seenIds.current.add(tempId);
    setMessages(prev => [optimistic, ...prev]);

    let ok = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      ok = await sendMessage(room.id, { _id: tempId, text, createdAt: ts, user: { _id: uid, name: uname } });
      if (ok) break;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }

    if (isMounted.current) {
      if (ok) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, pending: false, sent: true } : m));
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
        seenIds.current.delete(tempId);
        Alert.alert('Send Failed', 'Could not deliver message. Check your connection and try again.');
      }
    }
  }, [inputText, room.id, serverCtrl]);

  const pickAndSendImage = useCallback(async (source: 'gallery' | 'camera') => {
    Keyboard.dismiss();
    const perm = source === 'gallery'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Permita o acesso para enviar imagens.'); return; }

    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.25 })
      : await ImagePicker.launchCameraAsync({ quality: 0.25 });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (!isMounted.current) return;

    setSending(true);
    try {
      const sent = await sendMediaMessage(room.id, result.assets[0].uri, 'image', { _id: userIdRef.current, name: userNameRef.current });
      if (isMounted.current && !seenIds.current.has(sent._id)) {
        seenIds.current.add(sent._id);
        setMessages(prev => [{ _id: sent._id, text: '', createdAt: sent.createdAt, user: sent.user, image: sent.image }, ...prev]);
      }
    } catch (e: any) {
      if (isMounted.current) Alert.alert('Error', e?.message || 'Failed to send image.');
    } finally {
      if (isMounted.current) setSending(false);
    }
  }, [room.id]);

  const isConnected = connStatus === 'connected';

  const isChatBlocked = serverCtrl.maintenance || serverCtrl.pauseMessaging;
  const blockReason = serverCtrl.maintenance
    ? '🔴 Server under maintenance — messaging is temporarily unavailable'
    : '⏸ Messaging is paused by the administrator';

  const renderMessage = useCallback(({ item }: { item: MessageItem }) => {
    const isOwn = item.user._id === userIdRef.current;
    const statusTick = isOwn
      ? item.confirmed ? ' ✓✓' : item.sent ? ' ✓' : item.pending ? ' ⏳' : ' ✓'
      : '';
    const tickColor = item.confirmed ? Colors.neon : Colors.textMuted;
    return (
      <View style={[s.msgRow, isOwn ? s.msgRowRight : s.msgRowLeft]}>
        {!isOwn && <View style={s.avatar}><Text style={s.avatarText}>{item.user.name?.[0]?.toUpperCase() || '?'}</Text></View>}
        <View style={[s.bubble, isOwn ? s.bubbleOwn : s.bubbleOther, item.pending && s.bubblePending]}>
          {!isOwn && <Text style={s.senderName}>{item.user.name}</Text>}
          {item.image ? (
            <Image source={{ uri: item.image }} style={s.msgImage} resizeMode="cover" />
          ) : (
            <Text style={s.msgText}>{item.text}</Text>
          )}
          <View style={[s.msgMeta, isOwn ? s.msgMetaRight : s.msgMetaLeft]}>
            <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
            {isOwn && <Text style={[s.msgTick, { color: tickColor }]}>{statusTick}</Text>}
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.roomIcon}>{room.icon}</Text>
        <View style={s.headerInfo}>
          <Text style={s.roomName} numberOfLines={1}>{room.name}</Text>
          <Text style={s.roomSub}>{peerCount > 0 ? `${peerCount} peer${peerCount > 1 ? 's' : ''} in this channel` : 'Waiting for peers...'}</Text>
        </View>
        <View style={[s.connBadge, { backgroundColor: isConnected ? Colors.greenDim : Colors.redDim, borderColor: isConnected ? Colors.green : Colors.red }]}>
          <View style={[s.connDot, { backgroundColor: isConnected ? Colors.green : Colors.red }]} />
        </View>
      </View>

      {!isConnected && (
        <TouchableOpacity style={s.banner} onPress={reconnect}>
          <Text style={s.bannerText}>⚠ No connection — tap to reconnect</Text>
        </TouchableOpacity>
      )}

      {sending && (
        <View style={s.sendingBar}>
          <ActivityIndicator size="small" color={Colors.neon} />
          <Text style={s.sendingText}>Sending image P2P...</Text>
        </View>
      )}

      {!isReady ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={Colors.neon} />
          <Text style={s.loadingText}>Connecting to peers...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            inverted
            style={s.messageList}
            contentContainerStyle={[s.messageContent, { paddingBottom: 8 }]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>{room.icon}</Text>
                <Text style={s.emptyTitle}>No messages yet</Text>
                <Text style={s.emptySub}>Be the first to send a message{'\n'}in this channel. Messages expire in 1 hour.</Text>
              </View>
            }
          />

          {isChatBlocked ? (
            <View style={[s.blockedBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <Text style={s.blockedText}>{blockReason}</Text>
            </View>
          ) : (
          <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity style={s.mediaBtn} onPress={() => pickAndSendImage('gallery')} disabled={sending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.mediaIcon}>🖼</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaBtn} onPress={() => pickAndSendImage('camera')} disabled={sending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.mediaIcon}>📷</Text>
            </TouchableOpacity>
            <TextInput
              style={[s.input, !isConnected && { borderColor: Colors.red + '44' }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isConnected ? 'Message...' : '⚠ No connection...'}
              placeholderTextColor={isConnected ? Colors.textMuted : Colors.red + '88'}
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Text style={s.sendIcon}>▶</Text>
            </TouchableOpacity>
          </View>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: Colors.text },
  roomIcon: { fontSize: 26 },
  headerInfo: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  roomSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  connBadge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  banner: { backgroundColor: Colors.yellowDim, paddingHorizontal: 20, paddingVertical: 8 },
  bannerText: { fontSize: 12, color: Colors.yellow, fontWeight: '600', textAlign: 'center' },
  sendingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.neonDim, paddingVertical: 7 },
  sendingText: { fontSize: 12, color: Colors.neon, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  messageList: { flex: 1, backgroundColor: Colors.bg },
  messageContent: { paddingHorizontal: 12, paddingTop: 12 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgRowLeft: { flexDirection: 'row' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purple + '44',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: Colors.purple },
  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleOwn: {
    backgroundColor: Colors.sent, borderColor: Colors.sentBorder,
    borderBottomRightRadius: 4, marginLeft: 40,
  },
  bubbleOther: {
    backgroundColor: Colors.received, borderColor: Colors.receivedBorder,
    borderBottomLeftRadius: 4,
  },
  bubblePending: { opacity: 0.7 },
  senderName: { fontSize: 11, fontWeight: '700', color: Colors.neon, marginBottom: 4, letterSpacing: 0.3 },
  msgText: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  msgImage: { width: 200, height: 200, borderRadius: 12, marginVertical: 4 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 3 },
  msgMetaRight: { justifyContent: 'flex-end' },
  msgMetaLeft: { justifyContent: 'flex-start' },
  msgTime: { fontSize: 10, color: Colors.textMuted },
  msgTick: { fontSize: 10, fontWeight: '700' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 10, paddingTop: 10, gap: 8,
  },
  mediaBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  mediaIcon: { fontSize: 18 },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: Colors.text, lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.neon,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendIcon: { fontSize: 16, color: Colors.bg, marginLeft: 2 },
  blockedBar: {
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,71,87,0.4)',
    paddingHorizontal: 20, paddingTop: 14,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 64,
  },
  blockedText: {
    fontSize: 13, fontWeight: '700',
    color: Colors.red, textAlign: 'center', lineHeight: 20,
  },
});
