import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { getUserName, setUserName, getUserId, initPresence } from '../services/presence';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [focused, setFocused] = useState(false);

  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMounted.current = true;
    checkExistingUser();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    return () => { isMounted.current = false; };
  }, []);

  const checkExistingUser = async () => {
    try {
      const existingName = await getUserName();
      if (existingName && isMounted.current) {
        const userId = await getUserId();
        await initPresence(userId, existingName);
        if (isMounted.current) navigation.replace('Home');
        return;
      }
    } catch (_) {}
    if (isMounted.current) {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleEnter = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { Alert.alert('Invalid name', 'Minimum 2 characters.'); return; }
    if (trimmed.length > 20) { Alert.alert('Invalid name', 'Maximum 20 characters.'); return; }
    setJoining(true);
    try {
      await setUserName(trimmed);
      const userId = await getUserId();
      await initPresence(userId, trimmed);
      if (isMounted.current) navigation.replace('Home');
    } catch (_) {
      if (isMounted.current) { Alert.alert('Error', 'Please try again.'); setJoining(false); }
    }
  };

  if (loading) {
    return (
      <View style={s.splash}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <Animated.Text style={[s.logoText, { transform: [{ scale: pulseAnim }] }]}>🐝</Animated.Text>
      </View>
    );
  }

  const canJoin = name.trim().length >= 2 && !joining;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={s.bg}>
        <View style={[s.orb, s.orb1]} />
        <View style={[s.orb, s.orb2]} />
      </View>

      <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.logoWrap}>
          <Animated.Text style={[s.logoText, { transform: [{ scale: pulseAnim }] }]}>🐝</Animated.Text>
          <View style={s.logoBadge}>
            <View style={s.logoDot} />
          </View>
        </View>

        <Text style={s.title}>Hive</Text>
        <Text style={s.subtitle}>Encrypted P2P Chat{'\n'}zero data stored</Text>

        <View style={[s.inputWrap, focused && s.inputWrapFocused]}>
          <Text style={s.inputIcon}>👤</Text>
          <TextInput
            style={s.input}
            placeholder="What's your name?"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleEnter}
            editable={!joining}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, !canJoin && s.btnDisabled]}
          onPress={handleEnter}
          disabled={!canJoin}
          activeOpacity={0.85}
        >
          {joining
            ? <ActivityIndicator size="small" color={Colors.bg} />
            : <Text style={s.btnText}>Join Hive →</Text>
          }
        </TouchableOpacity>

        <View style={s.pills}>
          {[
            { icon: '🔒', label: 'E2E Encrypted' },
            { icon: '👻', label: 'No Sign-Up' },
            { icon: '💨', label: '1h TTL' },
          ].map(p => (
            <View key={p.label} style={s.pill}>
              <Text style={s.pillIcon}>{p.icon}</Text>
              <Text style={s.pillLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  splash: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  bg: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: {
    width: 280, height: 280,
    top: -80, right: -80,
    backgroundColor: Colors.neonDim,
  },
  orb2: {
    width: 200, height: 200,
    bottom: 100, left: -60,
    backgroundColor: Colors.purpleDim,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  logoWrap: {
    width: 90, height: 90,
    borderRadius: 26,
    backgroundColor: Colors.neonDim,
    borderWidth: 1, borderColor: Colors.neonBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  logoText: { fontSize: 42 },
  logoBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  logoDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.green,
    shadowColor: Colors.green, shadowOpacity: 0.8, shadowRadius: 4,
  },
  title: {
    fontSize: 44, fontWeight: '800', letterSpacing: -1.5,
    color: Colors.text, marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: Colors.textSub, textAlign: 'center',
    lineHeight: 22, marginBottom: 40,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginBottom: 16,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 16,
    height: 54,
  },
  inputWrapFocused: { borderColor: Colors.neon },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, color: Colors.text,
    height: '100%',
  },
  btn: {
    width: '100%', height: 54,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: Colors.neon,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.bg },
  pills: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.glassLight,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillIcon: { fontSize: 13 },
  pillLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});
