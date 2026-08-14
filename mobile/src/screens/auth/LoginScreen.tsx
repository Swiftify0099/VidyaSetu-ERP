/**
 * EduShakti One ERP — Premium Login Screen
 * ==========================================
 * Glassmorphism card, animated floating orbs, floating label inputs,
 * staggered entry animations, bilingual support (Marathi / English).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  Alert, StatusBar, Dimensions, Animated, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import PremiumInput from '../../components/ui/PremiumInput';
import PremiumButton from '../../components/ui/PremiumButton';
import { spacing, radius, typography, shadows } from '../../theme';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Floating Orb — decorative background element
// ─────────────────────────────────────────────────────────────────────────────
function FloatingOrb({ size, top, left, color, delay }: {
  size: number; top: number; left: number; color: string; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Animated.View style={{
      position: 'absolute',
      top, left,
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity: 0.25,
      transform: [{ translateY }, { scale }],
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [lang, setLang] = useState<'mr' | 'en'>('mr');

  // Entry animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(40)).current;
  const footerAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(footerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert(
        T.errorTitle,
        error,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  }, [error]);

  const T = {
    appName:    lang === 'mr' ? 'VidyaSetu' : 'VidyaSetu',
    subtitle:   lang === 'mr' ? 'अद्ययावत शैक्षणिक व्यवस्थापन ERP' : 'Smart Educational ERP Platform',
    welcome:    lang === 'mr' ? 'स्वागत आहे' : 'Welcome back',
    signIn:     lang === 'mr' ? 'साइन इन करा' : 'Sign In',
    username:   lang === 'mr' ? 'युजरनेम / मोबाईल' : 'Username / Mobile',
    password:   lang === 'mr' ? 'पासवर्ड' : 'Password',
    loginBtn:   lang === 'mr' ? 'लॉगिन करा' : 'Login',
    forgotPass: lang === 'mr' ? 'पासवर्ड विसरलात?' : 'Forgot password?',
    poweredBy:  lang === 'mr' ? 'द्वारे संचालित VidyaSetu ERP v1.0' : 'Powered by VidyaSetu ERP v1.0',
    errorTitle: lang === 'mr' ? 'त्रुटी' : 'Login Failed',
    required:   lang === 'mr' ? 'हे क्षेत्र आवश्यक आहे' : 'This field is required',
  };

  const validate = () => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');
    if (!username.trim()) { setUsernameError(T.required); valid = false; }
    if (!password.trim()) { setPasswordError(T.required); valid = false; }
    return valid;
  };

  const handleLogin = () => {
    if (!validate()) return;
    login(username.trim(), password);
  };

  const gradientColors = isDark
    ? ['#1e1b4b', '#312e81', '#4338ca']
    : ['#4338ca', '#4f46e5', '#6366f1'];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Gradient Hero ─────────────────────────────────────────── */}
      <Animated.View style={[styles.heroWrap, { opacity: headerAnim }]}>
        <LinearGradient colors={gradientColors} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Floating orbs */}
          <FloatingOrb size={180} top={-60}  left={-60}  color="#818cf8" delay={0}    />
          <FloatingOrb size={120} top={40}   left={width - 80} color="#a5b4fc" delay={800} />
          <FloatingOrb size={80}  top={100}  left={60}   color="#c7d2fe" delay={400} />

          {/* Language Toggle */}
          <TouchableOpacity
            style={[styles.langToggle, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            onPress={() => setLang(l => l === 'mr' ? 'en' : 'mr')}
            activeOpacity={0.75}
          >
            <Icon name="globe" size={12} color="#fff" solid />
            <Text style={styles.langText}>{lang === 'mr' ? 'EN' : 'मर'}</Text>
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={styles.heroContent}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>{T.appName}</Text>
            <Text style={styles.appSubtitle}>{T.subtitle}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── Login Card ─────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              ...shadows.xl,
              opacity: cardAnim,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>{T.welcome}</Text>
            <Text style={[styles.signInText, { color: colors.text }]}>{T.signIn}</Text>
            <View style={[styles.dividerAccent, { backgroundColor: colors.primary }]} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <PremiumInput
              label={T.username}
              value={username}
              onChangeText={t => { setUsername(t); setUsernameError(''); }}
              icon="user"
              error={usernameError}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <PremiumInput
              label={T.password}
              value={password}
              onChangeText={t => { setPassword(t); setPasswordError(''); }}
              icon="lock"
              error={passwordError}
              secureEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>{T.forgotPass}</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <PremiumButton
            label={isLoading ? '' : T.loginBtn}
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            size="lg"
            iconLeft={isLoading ? undefined : 'sign-in-alt'}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />

          {/* Dev credentials */}
          {__DEV__ && (
            <View style={[styles.devNote, { backgroundColor: colors.warningBg }]}>
              <Icon name="code" size={11} color={colors.warning} solid />
              <Text style={[styles.devNoteText, { color: colors.warning }]}>Dev: admin / Admin@2024!</Text>
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <Animated.View style={{ opacity: footerAnim }}>
          <Text style={[styles.footer, { color: colors.textTertiary }]}>{T.poweredBy}</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  heroWrap: {},
  hero: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 56,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  langToggle: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  langText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  heroContent: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.base,
    overflow: 'hidden',
    ...shadows.xl,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  appName: {
    color: '#fff',
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    marginTop: 4,
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  /* Card */
  card: {
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  cardHeader: { marginBottom: spacing.lg },
  welcomeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginBottom: 2,
  },
  signInText: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  dividerAccent: {
    width: 36,
    height: 3,
    borderRadius: radius.full,
  },

  /* Form */
  form: { gap: 4 },

  /* Forgot */
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: spacing.xs, marginBottom: spacing.xs },
  forgotText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Dev */
  devNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  devNoteText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  /* Footer */
  footer: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});
