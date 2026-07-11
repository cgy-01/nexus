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

export default function PasswordRegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && password.length >= 8 && password === confirmPassword && !isSubmitting;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ email: email.trim(), password, display_name: displayName.trim() || undefined });
      router.replace('/(app)/chat' as Href);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : '注册失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Text style={styles.title}>创建账号</Text>
          <Text style={styles.subtitle}>开始使用 Nexus AI 助手</Text>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.form}>
          <Text style={styles.label}>显示名称</Text>
          <TextInput style={styles.input} placeholder="你的名字（选填）" placeholderTextColor={Colors.light.nexusInputText} value={displayName} onChangeText={setDisplayName} textContentType="name" />
          <Text style={styles.label}>邮箱</Text>
          <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor={Colors.light.nexusInputText} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
          <Text style={styles.label}>密码</Text>
          <TextInput style={styles.input} placeholder="至少 8 位密码" placeholderTextColor={Colors.light.nexusInputText} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
          <Text style={styles.label}>确认密码</Text>
          <TextInput style={[styles.input, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]} placeholder="再次输入密码" placeholderTextColor={Colors.light.nexusInputText} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry textContentType="newPassword" autoComplete="new-password" onSubmitEditing={handleRegister} />
          {confirmPassword.length > 0 && password !== confirmPassword && <Text style={styles.errorText}>两次密码不一致</Text>}
          <Pressable style={({ pressed }) => [styles.submitButton, !canSubmit && styles.buttonDisabled, pressed && { opacity: 0.8 }]} onPress={handleRegister} disabled={!canSubmit}>
            {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>注册</Text>}
          </Pressable>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>已有账号？</Text>
          <Link href={'/(auth)/login' as Href} style={styles.link}>登录</Link>
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
  errorText: { color: '#CC0000', fontSize: 14, marginBottom: Spacing.one },
  form: { gap: Spacing.two },
  label: { color: '#000000', fontSize: 15, fontWeight: '500', marginBottom: Spacing.one },
  input: { backgroundColor: '#F5F5F5', borderColor: 'rgba(0,0,0,0.08)', borderRadius: 14, borderWidth: 1, color: '#000000', fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  inputError: { borderColor: '#CC0000' },
  submitButton: { alignItems: 'center', backgroundColor: '#000000', borderRadius: 14, marginTop: Spacing.two, paddingVertical: Spacing.three + 2 },
  buttonDisabled: { opacity: 0.4 },
  submitText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'center', marginTop: Spacing.five },
  footerText: { color: Colors.light.textSecondary, fontSize: 15 },
  link: { color: '#0066FF', fontSize: 15, fontWeight: '500' },
});
