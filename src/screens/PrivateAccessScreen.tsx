import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, StatusBar } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrivateAccess'>;
  route: RouteProp<RootStackParamList, 'PrivateAccess'>;
};

export default function PrivateAccessScreen({ navigation, route }: Props) {
  const { room, deviceId } = route.params;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(deviceId);
    } catch (_) {}
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.goldOrb} />

      <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>🔒</Text>
        </View>

        <Text style={s.title}>Access Restricted</Text>
        <Text style={s.desc}>
          The channel <Text style={s.roomName}>"{room.name}"</Text> requires device authorization from an admin.
        </Text>

        <View style={s.idBox}>
          <Text style={s.idLabel}>Your Device ID</Text>
          <Text style={s.idValue} selectable>{deviceId}</Text>
        </View>

        <TouchableOpacity style={s.copyBtn} onPress={handleCopy} activeOpacity={0.85}>
          <Text style={s.copyTxt}>📋 Copy Device ID</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Share this ID with an admin to request access</Text>

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.backTxt}>Go Back</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const GOLD = '#FFD700';
const GOLD_DIM = 'rgba(255, 215, 0, 0.15)';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  goldOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: GOLD_DIM, top: -60, right: -80 },
  card: {
    width: '100%', backgroundColor: Colors.glass, borderRadius: 24, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: GOLD + '33',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD + '44',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', color: GOLD, marginBottom: 14, textAlign: 'center' },
  desc: { fontSize: 15, color: Colors.textSub, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  roomName: { color: Colors.text, fontWeight: '700' },
  idBox: {
    width: '100%', backgroundColor: 'rgba(255, 215, 0, 0.08)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: GOLD + '22', marginBottom: 14, alignItems: 'center',
  },
  idLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  idValue: { fontSize: 13, fontWeight: '600', color: GOLD, fontFamily: 'monospace', textAlign: 'center' },
  copyBtn: { backgroundColor: GOLD_DIM, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: GOLD + '33', marginBottom: 14 },
  copyTxt: { fontSize: 14, fontWeight: '700', color: GOLD },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  backBtn: { width: '100%', backgroundColor: Colors.glass, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  backTxt: { fontSize: 15, fontWeight: '600', color: Colors.textSub },
});
