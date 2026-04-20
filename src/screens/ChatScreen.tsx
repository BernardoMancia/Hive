import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { GiftedChat, IMessage, Bubble, InputToolbar, Composer, Send } from 'react-native-gifted-chat';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../types';
import { subscribeToMessages, unsubscribeFromMessages, sendMessage } from '../services/gun';
import { sendMediaMessage } from '../services/media';
import { getUserId, getUserName, setCurrentRoom, subscribeToPresence, unsubscribeFromPresence } from '../services/presence';
import PeerStatus from '../components/PeerStatus';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { room } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserNameState] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const seenIds = useRef(new Set<string>());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initChat();
    return () => {
      unsubscribeFromMessages(room.id);
      unsubscribeFromPresence();
      setCurrentRoom('lobby');
    };
  }, []);

  const initChat = async () => {
    const id = await getUserId();
    const name = await getUserName();
    setUserId(id);
    setUserNameState(name || 'Anonymous');
    
    setCurrentRoom(room.id);

    subscribeToPresence((_count, roomCounts) => {
      setPeerCount(roomCounts[room.id] || 0);
    });

    subscribeToMessages(room.id, (msg: any) => {
      if (seenIds.current.has(msg._id)) return;
      seenIds.current.add(msg._id);
      
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        
        const newMsg: IMessage = {
          _id: msg._id,
          text: msg.text || '',
          createdAt: new Date(msg.createdAt),
          user: {
            _id: msg.user._id,
            name: msg.user.name,
          },
          image: msg.image,
          video: msg.video,
        };
        
        const updated = [...prev, newMsg];
        updated.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        return updated;
      });
    });
  };

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    if (!userId || !userName) return;
    
    newMessages.forEach((msg) => {
      sendMessage(room.id, {
        _id: msg._id as string,
        text: msg.text,
        createdAt: new Date(msg.createdAt).getTime(),
        user: { _id: userId, name: userName },
      });
    });
  }, [userId, userName, room.id]);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your gallery.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.6,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';

      setSending(true);
      await sendMediaMessage(
        room.id,
        asset.uri,
        type as 'image' | 'video',
        { _id: userId, name: userName }
      );
      setSending(false);
    } catch (error: any) {
      setSending(false);
      Alert.alert('Error', error.message || 'Failed to send media');
    }
  };

  const handleCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      setSending(true);
      await sendMediaMessage(
        room.id,
        result.assets[0].uri,
        'image',
        { _id: userId, name: userName }
      );
      setSending(false);
    } catch (error: any) {
      setSending(false);
      Alert.alert('Error', error.message || 'Failed to send photo');
    }
  };

  const renderBubble = (props: any) => (
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
      usernameStyle={{
        ...Typography.captionBold,
        color: Colors.primary,
      }}
    />
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={[
        styles.inputToolbar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
      primaryStyle={styles.inputPrimary}
    />
  );

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={styles.composer}
      placeholderTextColor={Colors.textMuted}
      placeholder="Type a message..."
    />
  );

  const renderSend = (props: any) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <View style={styles.sendButton}>
        <Text style={styles.sendIcon}>▶</Text>
      </View>
    </Send>
  );

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity onPress={handlePickImage} style={styles.actionBtn}>
        <Text style={styles.actionIcon}>🖼</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCamera} style={styles.actionBtn}>
        <Text style={styles.actionIcon}>📷</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.roomIcon}>{room.icon}</Text>
          <View style={styles.headerTexts}>
            <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
            <Text style={styles.roomDesc} numberOfLines={1}>{room.description}</Text>
          </View>
        </View>
        
        <PeerStatus peerCount={peerCount} />
      </View>

      {sending && (
        <View style={styles.sendingBar}>
          <Text style={styles.sendingText}>Sending media P2P...</Text>
        </View>
      )}

      <GiftedChat
        {...{
          messages,
          onSend: (msgs: IMessage[]) => onSend(msgs),
          user: {
            _id: userId,
            name: userName,
          },
          renderBubble,
          renderInputToolbar,
          renderComposer,
          renderSend,
          renderActions,
          scrollToBottom: true,
          scrollToBottomStyle: styles.scrollToBottom,
          timeTextStyle: {
            right: { color: Colors.textMuted, ...Typography.small },
            left: { color: Colors.textMuted, ...Typography.small },
          },
          bottomOffset: 0,
          minInputToolbarHeight: 56,
          keyboardShouldPersistTaps: 'handled',
          listViewProps: {
            style: { backgroundColor: Colors.background },
          },
        } as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    fontSize: 28,
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
    backgroundColor: Colors.primaryGlow,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
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
    paddingTop: 8,
  },
  inputPrimary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  composer: {
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginLeft: 4,
    marginRight: 6,
    minHeight: 44,
    maxHeight: 100,
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
  scrollToBottom: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
