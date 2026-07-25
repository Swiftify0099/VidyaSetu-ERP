/**
 * VidyaSetu Mobile — Login Screen
 * Professional school ERP login with bilingual support.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  secondary: '#818cf8',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  error: '#ef4444',
  border: '#d1d5db',
  inputBg: '#f9fafb',
};

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'mr' | 'en'>('mr');

  useEffect(() => {
    if (error) {
      Alert.alert(
        lang === 'mr' ? 'त्रुटी' : 'Error',
        error,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  }, [error]);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        lang === 'mr' ? 'माहिती भरा' : 'Required',
        lang === 'mr' ? 'कृपया युजरनेम आणि पासवर्ड भरा' : 'Please enter username and password'
      );
      return;
    }
    login(username.trim(), password);
  };

  const T = {
    title:    lang === 'mr' ? 'विद्यासेतु ERP' : 'VidyaSetu ERP',
    subtitle: lang === 'mr' ? 'शाळा व्यवस्थापन प्रणाली' : 'School Management System',
    username: lang === 'mr' ? 'युजरनेम / मोबाईल' : 'Username / Mobile',
    password: lang === 'mr' ? 'पासवर्ड' : 'Password',
    loginBtn: lang === 'mr' ? 'लॉगिन करा' : 'Login',
    poweredBy: lang === 'mr' ? 'द्वारे संचालित' : 'Powered by',
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark, '#312e81']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Language Toggle */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLang(l => l === 'mr' ? 'en' : 'mr')}
        >
          <Text style={styles.langBtnText}>{lang === 'mr' ? 'EN' : 'मर'}</Text>
        </TouchableOpacity>

        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>VS</Text>
          </View>
          <Text style={styles.headerTitle}>{T.title}</Text>
          <Text style={styles.headerSubtitle}>{T.subtitle}</Text>
        </View>
      </LinearGradient>

      {/* Login Card */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{T.username}</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={lang === 'mr' ? 'आपला युजरनेम टाका' : 'Enter your username'}
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{T.password}</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder={lang === 'mr' ? 'पासवर्ड टाका' : 'Enter password'}
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
              >
                <Text>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.loginBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>{T.loginBtn}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Demo credentials */}
          {__DEV__ && (
            <View style={styles.devNote}>
              <Text style={styles.devNoteText}>Dev: admin / admin123</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {T.poweredBy} VidyaSetu ERP v1.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0ff' },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  langBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  langBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  logoArea: { alignItems: 'center', marginTop: 16 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  headerTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13,
    marginTop: 4, fontWeight: '500',
  },

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  /* Form */
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600',
    color: COLORS.textSecondary, marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1, fontSize: 15,
    color: COLORS.text, paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },

  /* Login Button */
  loginBtn: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGradient: {
    height: 50, alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff', fontSize: 16,
    fontWeight: '700', letterSpacing: 0.5,
  },

  /* Dev */
  devNote: {
    marginTop: 12, padding: 8,
    backgroundColor: '#fef3c7', borderRadius: 6,
  },
  devNoteText: {
    fontSize: 11, color: '#92400e',
    textAlign: 'center', fontFamily: 'monospace',
  },

  /* Footer */
  footer: {
    textAlign: 'center', marginTop: 24,
    color: COLORS.textSecondary, fontSize: 12,
  },
});
