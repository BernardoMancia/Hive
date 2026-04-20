import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { RootStackParamList, ChatRoom } from '../types';
import { ROOMS } from '../config/rooms';
import {
  subscribeToPresence,
  unsubscribeFromPresence,
  isAgeVerified,
  setCurrentRoom,
  getUserName,
  setUserName,
  initPresence,
  getUserId,
} from '../services/presence';
import OnlineCounter from '../components/OnlineCounter';
import RoomCard from '../components/RoomCard';

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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setCurrentRoom('lobby');
    loadName();

    subscribeToPresence((count, counts, _peers) => {
      setOnlineCount(count);
      setRoomCounts(counts);
    });

    return () => {
      unsubscribeFromPresence();
    };
  }, []);

  const loadName = async () => {
    const name = await getUserName();
    if (name) setCurrentName(name);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleRoomPress = async (room: ChatRoom) => {
    if (room.isAdult) {
      const verified = await isAgeVerified();
      if (!verified) {
        navigation.navigate('AgeVerification', { room });
        return;
      }
    }
    navigation.navigate('Chat', { room });
  };

  const openNameModal = () => {
    setNewName(currentName);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid name', 'Please enter at least 2 characters.');
      return;
    }
    if (trimmed.length > 20) {
      Alert.alert('Invalid name', 'Maximum 20 characters allowed.');
      return;
    }
    setSavingName(true);
    try {
      await setUserName(trimmed);
      const userId = await getUserId();
      await initPresence(userId, trimmed);
      setCurrentName(trimmed);
      setShowNameModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
    setSavingName(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <Text style={styles.logo}>🐝</Text>
            <Text style={styles.appName}>Hive</Text>
          </View>
          <OnlineCounter count={onlineCount} />
        </View>

        <View style={styles.headerBottom}>
          <Text style={styles.headerSubtitle}>Pick a room to start chatting</Text>
          <TouchableOpacity
            style={styles.nameChip}
            onPress={openNameModal}
            activeOpacity={0.75}
          >
            <Text style={styles.nameChipText} numberOfLines={1}>
              👤 {currentName || '...'}
            </Text>
            <Text style={styles.nameChipEdit}>✎</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 32) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {ROOMS.map((room, index) => (
          <RoomCard
            key={room.id}
            room={room}
            peerCount={roomCounts[room.id] || 0}
            onPress={() => handleRoomPress(room)}
            index={index}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ⬡ P2P Network — every peer sustains the hive
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNameModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalCard}
            onPress={() => {}}
          >
            <Text style={styles.modalTitle}>Change Your Name</Text>
            <Text style={styles.modalSubtitle}>
              This is how other peers will see you
            </Text>

            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Your name..."
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSave,
                  (newName.trim().length < 2 || savingName) && styles.modalSaveDisabled,
                ]}
                onPress={handleSaveName}
                disabled={newName.trim().length < 2 || savingName}
              >
                <Text style={styles.modalSaveText}>
                  {savingName ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontSize: 28,
  },
  appName: {
    ...Typography.h1,
    color: Colors.primary,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    gap: 6,
    maxWidth: 150,
  },
  nameChipText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
  },
  nameChipEdit: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    ...Typography.small,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  modalInput: {
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
});
