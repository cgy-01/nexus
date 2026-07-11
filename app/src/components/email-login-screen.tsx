import { useEffect, useState } from 'react';
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
import { router, type Href } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';

export default function EmailLoginScreen() {
  const requestEmailCode = useAuthStore((state) => state.requestEmailCode);
  const verifyEmailCode = useAuthStore((state) => state.verifyEmailCode);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setTimeout(() => setSecondsRemaining((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const canRequestCode = email.trim().length > 0 && secondsRemaining === 0 && !isSubmitting;
  const canVerify = email.trim().length > 0 && code.length === 6 && !isSubmitting;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setCode('');
    setCodeSent(false);
  };

  const handleRequestCode = async () => {
    if (!canRequestCode) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await requestEmailCode({ email: email.trim() });
      setCodeSent(true);
      setSecondsRemaining(60);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '验证码发送失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmailCode({ email: email.trim(), code });
      router.replace('/(app)/chat' as Href);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : '验证码无效，请重试');
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
          <Text style={styles.title}>登录 Nexus</Text>
          <Text style={styles.subtitle}>输入邮箱获取登录验证码</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.form}>
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={Colors.light.nexusInputText}
            value={email}
            onChangeText={handleEmailChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!isSubmitting}
          />

          <Pressable
            style={({ pressed }) => [
              styles.codeButton,
              !canRequestCode && styles.buttonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleRequestCode}
            disabled={!canRequestCode}
          >
            <Text style={styles.codeButtonText}>
              {secondsRemaining > 0 ? `${secondsRemaining} 秒后重发` : codeSent ? '重新获取验证码' : '获取验证码'}
            </Text>
          </Pressable>

          {codeSent && (
            <>
              <Text style={styles.label}>验证码</Text>
              <TextInput
                style={styles.input}
                placeholder="6 位数字验证码"
                placeholderTextColor={Colors.light.nexusInputText}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                editable={!isSubmitting}
                onSubmitEditing={handleVerify}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  !canVerify && styles.buttonDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleVerify}
                disabled={!canVerify}
              >
                {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>验证并登录</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four },
  header: { marginBottom: Spacing.five },
  title: { fontSize: 28, fontWeight: '600', color: '#000000' },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: Spacing.one },
  errorText: { color: '#CC0000', fontSize: 14, marginBottom: Spacing.three },
  form: { gap: Spacing.two },
  label: { color: '#000000', fontSize: 15, fontWeight: '500', marginBottom: Spacing.one },
  input: {
    backgroundColor: '#F5F5F5',
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#000000',
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  codeButton: { alignItems: 'center', borderRadius: 14, paddingVertical: Spacing.three },
  codeButtonText: { color: '#0066FF', fontSize: 15, fontWeight: '500' },
  submitButton: { alignItems: 'center', backgroundColor: '#000000', borderRadius: 14, marginTop: Spacing.two, paddingVertical: Spacing.three + 2 },
  buttonDisabled: { opacity: 0.4 },
  submitText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
