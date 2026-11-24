import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Video, ResizeMode } from 'expo-av';
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
import MediaViewer from '../components/MediaViewer';

type MessageItem = {
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
  video?: string;
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
  const [mediaModal, setMediaModal] = useState<{ uri: string; type: 'image' | 'video'; sender: string; ts: number } | null>(null);

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
            return [{ _id: msg._id, text: msg.text || '', createdAt: msg.createdAt, user: msg.user, image: msg.image, video: msg.video }, ...prev];
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
        Alert.alert('Falha', 'Mensagem não enviada. Verifique sua conexão.');
      }
    }
  }, [inputText, room.id, serverCtrl]);

  const pickAndSendMedia = useCallback(async (source: 'gallery' | 'camera') => {
    Keyboard.dismiss();
    const perm = source === 'gallery'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Permita o acesso para enviar mídia.'); return; }

    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.5, videoMaxDuration: 30 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.5, videoMaxDuration: 30 });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (!isMounted.current) return;

    setSending(true);
    try {
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      const sent = await sendMediaMessage(room.id, asset.uri, mediaType, { _id: userIdRef.current, name: userNameRef.current });
      if (isMounted.current && !seenIds.current.has(sent._id)) {
        seenIds.current.add(sent._id);
        setMessages(prev => [{ _id: sent._id, text: '', createdAt: sent.createdAt, user: sent.user, image: sent.image, video: sent.video }, ...prev]);
      }
    } catch (e: any) {
      if (isMounted.current) Alert.alert('Erro', e?.message || 'Falha ao enviar mídia.');
    } finally {
      if (isMounted.current) setSending(false);
    }
  }, [room.id]);

  const openMedia = useCallback((uri: string, type: 'image' | 'video', sender: string, ts: number) => {
    setMediaModal({ uri, type, sender, ts });
  }, []);

  const isConnected = connStatus === 'connected';
  const isChatBlocked = serverCtrl.maintenance || serverCtrl.pauseMessaging;
  const blockReason = serverCtrl.maintenance
    ? '🔴 Servidor em manutenção'
    : '⏸ Mensagens pausadas pelo admin';

  const renderMessage = useCallback(({ item, index }: { item: MessageItem; index: number }) => {
    const isOwn = item.user._id === userIdRef.current;
    const nextMsg = messages[index + 1];
    const sameSenderAsNext = nextMsg && nextMsg.user._id === item.user._id;
    const showName = !isOwn && !sameSenderAsNext;
    const showTail = !sameSenderAsNext;
    const marginBot = sameSenderAsNext ? 2 : 10;

    const statusIcon = isOwn
      ? item.confirmed ? '✓✓' : item.sent ? '✓' : item.pending ? '⏳' : '✓'
      : null;
    const statusColor = item.confirmed ? '#4FC3F7' : 'rgba(255,255,255,0.4)';

    const hasMedia = !!(item.image || item.video);

    return (
      <View style={[s.msgRow, isOwn ? s.msgRowRight : s.msgRowLeft, { marginBottom: marginBot }]}>
        {!isOwn && (
          <View style={[s.avatar, !showTail && { opacity: 0 }]}>
            <Text style={s.avatarText}>{item.user.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={[
          s.bubble,
          isOwn ? s.bubbleOwn : s.bubbleOther,
          isOwn && showTail && s.bubbleOwnTail,
          !isOwn && showTail && s.bubbleOtherTail,
          item.pending && s.bubblePending,
          hasMedia && s.bubbleMedia,
        ]}>
          {showName && <Text style={s.senderName}>{item.user.name}</Text>}

          {item.image ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openMedia(item.image!, 'image', item.user.name, item.createdAt)}
            >
              <Image source={{ uri: item.image }} style={s.msgImage} resizeMode="cover" />
              <View style={s.mediaTimeBadge}>
                <Text style={s.mediaTimeText}>{formatTime(item.createdAt)}</Text>
                {statusIcon && <Text style={[s.mediaStatusIcon, { color: statusColor }]}>{statusIcon}</Text>}
              </View>
            </TouchableOpacity>
          ) : item.video ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openMedia(item.video!, 'video', item.user.name, item.createdAt)}
            >
              <View style={s.videoThumb}>
                <Video
                  source={{ uri: item.video }}
                  style={s.videoPreview}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isMuted
                />
                <View style={s.playOverlay}>
                  <View style={s.playBtn}>
                    <Text style={s.playIcon}>▶</Text>
                  </View>
                </View>
                <View style={s.mediaTimeBadge}>
                  <Text style={s.mediaTimeText}>{formatTime(item.createdAt)}</Text>
                  {statusIcon && <Text style={[s.mediaStatusIcon, { color: statusColor }]}>{statusIcon}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={s.msgText}>{item.text}</Text>
              <View style={s.msgMeta}>
                <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
                {statusIcon && <Text style={[s.msgStatus, { color: statusColor }]}>{statusIcon}</Text>}
              </View>
            </>
          )}
        </View>
      </View>
    );
  }, [messages, openMedia]);

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
          <Text style={s.roomSub}>
            {peerCount > 0 ? `${peerCount} online` : 'Aguardando peers...'}
          </Text>
        </View>
        <View style={[s.connBadge, { backgroundColor: isConnected ? 'rgba(0,230,118,0.15)' : 'rgba(255,71,87,0.15)', borderColor: isConnected ? Colors.green : Colors.red }]}>
          <View style={[s.connDot, { backgroundColor: isConnected ? Colors.green : Colors.red }]} />
        </View>
      </View>

      {!isConnected && (
        <TouchableOpacity style={s.banner} onPress={reconnect}>
          <Text style={s.bannerText}>⚠ Sem conexão — toque para reconectar</Text>
        </TouchableOpacity>
      )}

      {sending && (
        <View style={s.sendingBar}>
          <ActivityIndicator size="small" color={Colors.neon} />
          <Text style={s.sendingText}>Enviando mídia P2P...</Text>
        </View>
      )}

      {!isReady ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={Colors.neon} />
          <Text style={s.loadingText}>Conectando aos peers...</Text>
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
                <Text style={s.emptyTitle}>Sem mensagens</Text>
                <Text style={s.emptySub}>Seja o primeiro a enviar uma mensagem.{'\n'}Mensagens expiram em 24h.</Text>
              </View>
            }
          />

          {isChatBlocked ? (
            <View style={[s.blockedBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <Text style={s.blockedText}>{blockReason}</Text>
            </View>
          ) : (
          <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity style={s.attachBtn} onPress={() => pickAndSendMedia('gallery')} disabled={sending}>
              <Text style={s.attachIcon}>📎</Text>
            </TouchableOpacity>
            <TextInput
              style={[s.input, !isConnected && { borderColor: Colors.red + '44' }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isConnected ? 'Mensagem...' : '⚠ Sem conexão...'}
              placeholderTextColor={isConnected ? 'rgba(255,255,255,0.3)' : Colors.red + '88'}
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            {inputText.trim() ? (
              <TouchableOpacity style={s.sendBtn} onPress={handleSend} activeOpacity={0.7}>
                <Text style={s.sendIcon}>➤</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.cameraBtn} onPress={() => pickAndSendMedia('camera')} disabled={sending}>
                <Text style={s.cameraIcon}>📷</Text>
              </TouchableOpacity>
            )}
          </View>
          )}
        </KeyboardAvoidingView>
      )}

      {mediaModal && (
        <MediaViewer
          visible={!!mediaModal}
          uri={mediaModal.uri}
          type={mediaModal.type}
          senderName={mediaModal.sender}
          timestamp={mediaModal.ts}
          onClose={() => setMediaModal(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 10,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: 22, color: Colors.text },
  roomIcon: { fontSize: 24 },
  headerInfo: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  roomSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  connBadge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  connDot: { width: 10, height: 10, borderRadius: 5 },

  banner: { backgroundColor: 'rgba(255,211,42,0.12)', paddingHorizontal: 20, paddingVertical: 8 },
  bannerText: { fontSize: 12, color: Colors.yellow, fontWeight: '600', textAlign: 'center' },

  sendingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,212,255,0.08)', paddingVertical: 7 },
  sendingText: { fontSize: 12, color: Colors.neon, fontWeight: '600' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 13, color: Colors.textMuted },

  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: 8, paddingTop: 8 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgRowLeft: { flexDirection: 'row' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(124,77,255,0.2)', borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: Colors.purple },

  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#1a3a4a',
    borderBottomRightRadius: 18,
    marginLeft: 48,
  },
  bubbleOther: {
    backgroundColor: '#1e2833',
    borderBottomLeftRadius: 18,
  },
  bubbleOwnTail: {
    borderBottomRightRadius: 4,
  },
  bubbleOtherTail: {
    borderBottomLeftRadius: 4,
  },
  bubblePending: { opacity: 0.6 },
  bubbleMedia: {
    paddingHorizontal: 3, paddingVertical: 3,
    overflow: 'hidden',
  },

  senderName: {
    fontSize: 13, fontWeight: '700', color: '#7C4DFF',
    marginBottom: 2, marginLeft: 4,
  },

  msgText: { fontSize: 15, color: '#e8e8e8', lineHeight: 21 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2, gap: 4 },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  msgStatus: { fontSize: 11, fontWeight: '700' },

  msgImage: { width: 240, height: 240, borderRadius: 14 },

  videoThumb: { width: 240, height: 160, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  videoPreview: { width: 240, height: 160 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  playIcon: { fontSize: 20, color: '#fff', marginLeft: 3 },

  mediaTimeBadge: {
    position: 'absolute', bottom: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mediaTimeText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  mediaStatusIcon: { fontSize: 11, fontWeight: '700' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8, paddingTop: 8, gap: 6,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: Colors.text, lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.neon,
    justifyContent: 'center', alignItems: 'center',
  },
  sendIcon: { fontSize: 20, color: Colors.bg, marginLeft: 1 },
  cameraBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  cameraIcon: { fontSize: 22 },

  blockedBar: {
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,71,87,0.3)',
    paddingHorizontal: 20, paddingTop: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 64,
  },
  blockedText: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', lineHeight: 20 },
});
