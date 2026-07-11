import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, type Href } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';

export default function PasswordLoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(app)/chat' as Href);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Text style={styles.title}>欢迎回来</Text>
          <Text style={styles.subtitle}>登录以继续使用 Nexus</Text>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
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
            style={({ pressed }) => [styles.submitButton, !canSubmit && styles.buttonDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>登录</Text>}
          </Pressable>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <Link href={'/(auth)/register' as Href} style={styles.link}>注册</Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four },
  header: { marginBottom: Spacing.five },
  title: { color: '#000000', fontSize: 28, fontWeight: '600' },
  subtitle: { color: Colors.light.textSecondary, fontSize: 16, marginTop: Spacing.one },
  errorText: { color: '#CC0000', fontSize: 14, marginBottom: Spacing.three },
  form: { gap: Spacing.two },
  label: { color: '#000000', fontSize: 15, fontWeight: '500', marginBottom: Spacing.one },
  input: { backgroundColor: '#F5F5F5', borderColor: 'rgba(0,0,0,0.08)', borderRadius: 14, borderWidth: 1, color: '#000000', fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  submitButton: { alignItems: 'center', backgroundColor: '#000000', borderRadius: 14, marginTop: Spacing.two, paddingVertical: Spacing.three + 2 },
  buttonDisabled: { opacity: 0.4 },
  submitText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'center', marginTop: Spacing.five },
  footerText: { color: Colors.light.textSecondary, fontSize: 15 },
  link: { color: '#0066FF', fontSize: 15, fontWeight: '500' },
});
