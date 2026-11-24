import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { setAgeVerified } from '../services/presence';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgeVerification'>;
  route: RouteProp<RootStackParamList, 'AgeVerification'>;
};

export default function AgeVerificationScreen({ navigation, route }: Props) {
  const { room } = route.params;
  const [confirming, setConfirming] = useState(false);
  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    isMounted.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
    return () => { isMounted.current = false; };
  }, []);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await setAgeVerified();
      if (isMounted.current) navigation.replace('Chat', { room });
    } catch (_) {
      if (isMounted.current) setConfirming(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.redOrb} />

      <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>🔞</Text>
        </View>

        <Text style={s.title}>18+ Content</Text>
        <Text style={s.desc}>
          The channel <Text style={s.roomName}>"{room.name}"</Text> contains content exclusively for adults aged 18 and over.
        </Text>
        <Text style={s.warn}>
          By continuing, you confirm that you are 18 or older and take full responsibility for accessing this content.
        </Text>

        <View style={s.btns}>
          <TouchableOpacity style={[s.confirmBtn, confirming && { opacity: 0.6 }]} onPress={handleConfirm} disabled={confirming} activeOpacity={0.85}>
            {confirming
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={s.confirmTxt}>I am 18+, enter</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} disabled={confirming} activeOpacity={0.85}>
            <Text style={s.cancelTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  redOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: Colors.redDim, top: -60, right: -80 },
  card: {
    width: '100%', backgroundColor: Colors.glass, borderRadius: 24, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.red + '33',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.redDim, borderWidth: 1, borderColor: Colors.red + '44',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.red, marginBottom: 14, textAlign: 'center' },
  desc: { fontSize: 15, color: Colors.textSub, textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  roomName: { color: Colors.text, fontWeight: '700' },
  warn: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 18 },
  btns: { width: '100%', gap: 12 },
  confirmBtn: { backgroundColor: Colors.red, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cancelBtn: { backgroundColor: Colors.glass, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: Colors.textSub },
});
