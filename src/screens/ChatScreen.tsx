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
} from 'react-native';
import {
  GiftedChat,
  IMessage,
  Bubble,
  InputToolbar,
  Composer,
  Send,
} from 'react-native-gifted-chat';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../types';
import { subscribeToMessages, sendMessage } from '../services/gun';
import { sendMediaMessage } from '../services/media';
import {
  getUserId,
  getUserName,
  setCurrentRoom,
  subscribeToPresence,
} from '../services/presence';
import { useConnectionStatus } from '../services/connection';
import PeerStatus from '../components/PeerStatus';
import ConnectionBanner from '../components/ConnectionBanner';
import EmptyChat from '../components/EmptyChat';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { room } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const isMounted = useRef(true);
  const seenIds = useRef(new Set<string>());
  const unsubMessages = useRef<(() => void) | null>(null);
  const unsubPresence = useRef<(() => void) | null>(null);
  const userIdRef = useRef('');
  const userNameRef = useRef('Anonymous');

  const insets = useSafeAreaInsets();
  const { status: connStatus, reconnect } = useConnectionStatus();

  useEffect(() => {
    isMounted.current = true;
    initChat();

    return () => {
      isMounted.current = false;
      unsubMessages.current?.();
      unsubPresence.current?.();
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

      const unsubM = subscribeToMessages(room.id, (msg) => {
        if (!isMounted.current) return;
        if (seenIds.current.has(msg._id)) return;
        seenIds.current.add(msg._id);

        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [
            {
              _id: msg._id,
              text: msg.text || '',
              createdAt: new Date(msg.createdAt),
              user: { _id: msg.user._id, name: msg.user.name },
              image: msg.image,
            },
            ...prev,
          ];
        });
      });
      unsubMessages.current = unsubM;

      if (isMounted.current) {
        setIsReady(true);
      }
    } catch (e) {
      console.warn('[Hive:chat] initChat error:', e);
      if (isMounted.current) {
        setIsReady(true);
      }
    }
  };

  const appendOptimistic = useCallback((msg: IMessage) => {
    const id = msg._id as string;
    if (seenIds.current.has(id)) return;
    seenIds.current.add(id);
    setMessages((prev) => [msg, ...prev]);
  }, []);

  const onSend = useCallback(
    (newMessages: IMessage[] = []) => {
      const uid = userIdRef.current;
      const uname = userNameRef.current;
      if (!uid) return;

      newMessages.forEach((msg) => {
        const success = sendMessage(room.id, {
          _id: msg._id as string,
          text: msg.text,
          createdAt: new Date(msg.createdAt).getTime(),
          user: { _id: uid, name: uname },
        });

        if (!success) {
          Alert.alert('Send failed', 'Message could not be sent. Check your connection.');
        }
      });
    },
    [room.id]
  );

  const pickAndSendImage = useCallback(
    async (source: 'gallery' | 'camera') => {
      Keyboard.dismiss();

      const permission =
        source === 'gallery'
          ? await ImagePicker.requestMediaLibraryPermissionsAsync()
          : await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          source === 'gallery'
            ? 'Please allow access to your gallery.'
            : 'Please allow access to your camera.'
        );
        return;
      }

      const result =
        source === 'gallery'
          ? await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.3,
              allowsEditing: true,
            })
          : await ImagePicker.launchCameraAsync({
              quality: 0.3,
              allowsEditing: true,
            });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      if (!isMounted.current) return;
      setSending(true);

      try {
        const sent = await sendMediaMessage(room.id, result.assets[0].uri, 'image', {
          _id: userIdRef.current,
          name: userNameRef.current,
        });

        if (isMounted.current) {
          appendOptimistic({
            _id: sent._id,
            text: '',
            createdAt: new Date(sent.createdAt),
            user: { _id: sent.user._id, name: sent.user.name },
            image: sent.image,
          });
        }
      } catch (error: any) {
        if (isMounted.current) {
          Alert.alert('Error', error?.message || 'Failed to send image.');
        }
      } finally {
        if (isMounted.current) setSending(false);
      }
    },
    [room.id, appendOptimistic]
  );

  const renderBubble = useCallback(
    (props: any) => (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: Colors.message.sent,
            borderWidth: 1,
            borderColor: Colors.message.sentBorder,
            borderRadius: 16,
            borderBottomRightRadius: 4,
          },
          left: {
            backgroundColor: Colors.message.received,
            borderWidth: 1,
            borderColor: Colors.message.receivedBorder,
            borderRadius: 16,
            borderBottomLeftRadius: 4,
          },
        }}
        textStyle={{
          right: { color: Colors.text, ...Typography.body },
          left: { color: Colors.text, ...Typography.body },
        }}
        usernameStyle={{ ...Typography.captionBold, color: Colors.primary }}
      />
    ),
    []
  );

  const renderInputToolbar = useCallback(
    (props: any) => (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    ),
    []
  );

  const renderComposer = useCallback(
    (props: any) => (
      <Composer
        {...props}
        textInputStyle={styles.composer}
        placeholderTextColor={Colors.textMuted}
        placeholder="Type a message..."
      />
    ),
    []
  );

  const renderSend = useCallback(
    (props: any) => (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={styles.sendButton}>
          <Text style={styles.sendIcon}>▶</Text>
        </View>
      </Send>
    ),
    []
  );

  const renderActions = useMemo(
    () => () => (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => pickAndSendImage('gallery')}
          style={styles.actionBtn}
          disabled={sending}
        >
          <Text style={styles.actionIcon}>🖼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickAndSendImage('camera')}
          style={styles.actionBtn}
          disabled={sending}
        >
          <Text style={styles.actionIcon}>📷</Text>
        </TouchableOpacity>
      </View>
    ),
    [sending, pickAndSendImage]
  );

  const renderChatEmpty = useCallback(() => <EmptyChat />, []);

  const giftedUser = useMemo(
    () => ({ _id: userIdRef.current || 'pending', name: userNameRef.current }),
    [isReady]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.roomIcon}>{room.icon}</Text>
          <View style={styles.headerTexts}>
            <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
            <Text style={styles.roomDesc} numberOfLines={1}>{room.description}</Text>
          </View>
        </View>
        <PeerStatus peerCount={peerCount} isConnected={connStatus === 'connected'} />
      </View>

      <ConnectionBanner status={connStatus} onReconnect={reconnect} />

      {sending && (
        <View style={styles.sendingBar}>
          <ActivityIndicator size="small" color={Colors.primary} style={styles.sendingSpinner} />
          <Text style={styles.sendingText}>Sending image P2P...</Text>
        </View>
      )}

      {!isReady ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Connecting to peers...</Text>
        </View>
      ) : (
        <GiftedChat
          {...({
            messages,
            onSend: (msgs: IMessage[]) => onSend(msgs),
            user: giftedUser,
            renderBubble,
            renderInputToolbar,
            renderComposer,
            renderSend,
            renderActions,
            renderChatEmpty,
            inverted: true,
            alwaysShowSend: true,
            renderUsernameOnMessage: true,
            showAvatarForEveryMessage: false,
            timeTextStyle: {
              right: { color: Colors.textMuted, ...Typography.small },
              left: { color: Colors.textMuted, ...Typography.small },
            },
            bottomOffset: Platform.OS === 'ios' ? insets.bottom : 0,
            minInputToolbarHeight: 60,
            keyboardShouldPersistTaps: 'handled',
            listViewProps: {
              style: { backgroundColor: Colors.background },
              keyboardDismissMode: 'interactive',
            },
          } as any)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.text,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTexts: {
    flex: 1,
  },
  roomIcon: {
    fontSize: 26,
  },
  roomName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  roomDesc: {
    ...Typography.small,
    color: Colors.textMuted,
  },
  sendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryGlow,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sendingSpinner: {
    marginRight: 8,
  },
  sendingText: {
    ...Typography.small,
    color: Colors.primary,
  },
  inputToolbar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  inputPrimary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  composer: {
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    marginLeft: 4,
    marginRight: 6,
    minHeight: 42,
    maxHeight: 120,
    fontSize: 15,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    width: 44,
    marginRight: 2,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 16,
    color: Colors.textInverse,
    marginLeft: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 4,
    marginLeft: 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    fontSize: 20,
  },
});
