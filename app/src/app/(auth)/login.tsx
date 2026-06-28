/**
 * 登录页
 */

import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link, type Href } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';
import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('12345678');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !isSubmitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(app)/chat' as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>欢迎回来</Text>
          <Text style={styles.subtitle}>登录以继续使用 Nexus</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={Colors.light.nexusInputText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入密码"
            placeholderTextColor={Colors.light.nexusInputText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            onSubmitEditing={handleLogin}
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>登录</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <Link href={'/(auth)/register' as Href} style={styles.link}>
            去注册
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  form: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: Spacing.one,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: Spacing.three + 2,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.five,
    gap: Spacing.one,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  link: {
    color: '#0066FF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
});
