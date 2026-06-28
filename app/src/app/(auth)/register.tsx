/**
 * 注册页
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

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    password === confirmPassword &&
    !isSubmitting;

  const handleRegister = async () => {
    if (!canSubmit) return;
    if (password.length < 8) {
      setError('密码至少需要 8 位');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
      });
      router.replace('/(app)/chat' as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
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
          <Text style={styles.title}>创建账号</Text>
          <Text style={styles.subtitle}>开始使用 Nexus AI 助手</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>显示名称</Text>
          <TextInput
            style={styles.input}
            placeholder="你的名字（选填）"
            placeholderTextColor={Colors.light.nexusInputText}
            value={displayName}
            onChangeText={setDisplayName}
            textContentType="name"
          />

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
            placeholder="至少 6 位密码"
            placeholderTextColor={Colors.light.nexusInputText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />

          <Text style={styles.label}>确认密码</Text>
          <TextInput
            style={[
              styles.input,
              confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
            ]}
            placeholder="再次输入密码"
            placeholderTextColor={Colors.light.nexusInputText}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            onSubmitEditing={handleRegister}
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.fieldError}>两次密码不一致</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleRegister}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>注册</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>已有账号？</Text>
          <Link href={'/(auth)/login' as Href} style={styles.link}>
            去登录
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
  inputError: {
    borderColor: '#CC0000',
  },
  fieldError: {
    color: '#CC0000',
    fontSize: 13,
    marginTop: -Spacing.one,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
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
