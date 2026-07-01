/**
 * 个人信息详情页 — 支持修改头像（相册/拍照）和昵称
 */

import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import { Spacing } from '@/constants/theme';
import { CameraIcon } from '@/components/icons';
import { SERVER_HOST } from '@/services/api';
import { tokenStore } from '@/services/token';

/* ── Chevron ── */
function ChevronRight() {
  return <Text style={styles.chevronIcon}>{'›'}</Text>;
}

/* ── Info Row ── */
function InfoRow({
  label,
  value,
  action,
  onPress,
}: {
  label: string;
  value?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={rowStyles.row} onPress={onPress} disabled={!onPress}>
      <Text style={rowStyles.label}>{label}</Text>
      {value !== undefined ? (
        <Text style={rowStyles.value}>{value}</Text>
      ) : action ? (
        <View style={rowStyles.actionWrap}>
          <Text style={rowStyles.actionText}>{action}</Text>
          <ChevronRight />
        </View>
      ) : null}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  label: { fontSize: 17, color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  value: { fontSize: 16, color: '#60646C', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  actionWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 16, color: '#60646C', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
});

export default function ProfileDetailScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const displayName = user?.display_name ?? '未设置名称';
  const userId = user?.uid ?? (user?.id ?? '38271').slice(0, 5);

  const [nameModal, setNameModal] = useState(false);
  const [avatarPicker, setAvatarPicker] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  /* ── 昵称编辑 ── */
  const openNameEdit = () => {
    setEditValue(user?.display_name ?? '');
    setNameModal(true);
  };
  const handleNameSave = async () => {
    setSaving(true);
    try {
      const res = await userService.updateProfile({ display_name: editValue.trim() || displayName });
      if (res.data) setUser(res.data);
      setNameModal(false);
    } catch {
      Alert.alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  /* ── 修改头像：打开相册 ── */
  const changeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('需要权限', '请在设置中允许访问相册'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) uploadAvatar(result.assets[0].uri);
  };

  /* ── 保存头像 — 下载后调出分享菜单 ── */
  const saveAvatar = async () => {
    if (!avatarUrl) { Alert.alert('暂无头像'); return; }
    try {
      setSaving(true);
      const localUri = FileSystem.cacheDirectory + 'avatar.jpg';
      await FileSystem.downloadAsync(avatarUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, { mimeType: 'image/jpeg' });
      } else {
        Alert.alert('提示', '当前设备不支持分享');
      }
    } catch {
      Alert.alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setAvatarPicker(false);
    setSaving(true);
    try {
      const token = tokenStore.getAccessToken();
      const result = await FileSystem.uploadAsync(
        `${SERVER_HOST}/api/v1/users/me/avatar`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const json = JSON.parse(result.body);
      if (json.data) setUser(json.data);
    } catch (e) {
      console.error('[avatar] upload failed', e);
      Alert.alert('上传失败');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = user?.avatar_url
    ? `http://121.41.31.221:8001${user.avatar_url}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>设置</Text>
        <Pressable onPress={() => router.back()} style={styles.backCircle}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 个人信息卡片 */}
        <View style={styles.profileCard}>
          {/* 头像 — 带相机图标 */}
          <Pressable style={rowStyles.row} onPress={() => setAvatarPicker(true)}>
            <Text style={rowStyles.label}>头像</Text>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(displayName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <CameraIcon size={12} />
              </View>
            </View>
          </Pressable>

          <View style={styles.cardDivider} />

          {/* 昵称 */}
          <Pressable style={rowStyles.row} onPress={openNameEdit}>
            <Text style={rowStyles.label}>昵称</Text>
            <Text style={rowStyles.value}>{displayName}</Text>
          </Pressable>

          <View style={styles.cardDivider} />

          {/* UID */}
          <InfoRow label="UID" value={userId} />
        </View>

        {/* 绑定信息卡片 */}
        <View style={styles.bindCard}>
          <InfoRow label="手机号" action="去绑定" />
          <View style={styles.cardDivider} />
          <InfoRow label="微信" action="去绑定" />
          <View style={styles.cardDivider} />
          <InfoRow label="邮箱" action="去绑定" />
        </View>
      </ScrollView>

      {/* 昵称编辑弹窗 */}
      <Modal visible={nameModal} transparent animationType="fade">
        <Pressable style={styles.overlayCenter} onPress={() => setNameModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>修改昵称</Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="输入新昵称"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setNameModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalSave, saving && { opacity: 0.5 }]} onPress={handleNameSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>保存</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 头像选取弹窗 */}
      <Modal visible={avatarPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setAvatarPicker(false)}>
          <Pressable style={styles.avatarSheet} onPress={() => {}}>
            {/* 头像大图 */}
            <View style={styles.avatarLarge}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarLargeImg} />
              ) : (
                <View style={styles.avatarLargePlaceholder}>
                  <Text style={styles.avatarLargeText}>
                    {(displayName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* 操作按钮 */}
            <Pressable style={styles.pickBtn} onPress={changeAvatar}>
              <Text style={styles.pickBtnText}>修改头像</Text>
            </Pressable>
            <Pressable style={[styles.pickBtn, styles.pickBtnSecondary]} onPress={saveAvatar} disabled={saving}>
              <Text style={styles.pickBtnTextSecondary}>保存头像</Text>
            </Pressable>

            <Pressable style={styles.pickCancel} onPress={() => setAvatarPicker(false)}>
              <Text style={styles.pickCancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  topTitle: { fontSize: 17, fontWeight: '600', color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  backCircle: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, fontWeight: '700', color: '#000000', lineHeight: 24 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingTop: Spacing.two },

  /* Cards */
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Spacing.one, marginBottom: Spacing.three },
  bindCard: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Spacing.one },
  cardDivider: { height: 0.5, backgroundColor: '#E8E8E8', width: '100%' },

  /* Avatar */
  avatarWrap: { position: 'relative' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  cameraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E8E8E8',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Overlays */
  overlay: { flex: 1, backgroundColor: '#00000059', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: '#00000059', justifyContent: 'center', alignItems: 'center', padding: 40 },
  avatarSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.four, alignItems: 'center' },
  avatarLarge: { marginBottom: Spacing.four },
  avatarLargePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  avatarLargeText: { fontSize: 40, fontWeight: '600', color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  avatarLargeImg: { width: 100, height: 100, borderRadius: 50 },
  pickBtn: {
    width: '100%', backgroundColor: '#000000', borderRadius: 14,
    paddingVertical: Spacing.three + 2, alignItems: 'center',
    marginBottom: 10,
  },
  pickBtnSecondary: { backgroundColor: '#F5F5F5' },
  pickBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  pickBtnTextSecondary: { fontSize: 17, fontWeight: '500', color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  pickCancel: { paddingVertical: Spacing.three, marginTop: Spacing.one },
  pickCancelText: { fontSize: 16, color: '#9CA3AF', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },

  /* Name modal */
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.four, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: Spacing.two, fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 16, color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: Spacing.four },
  modalCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: Spacing.three, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#60646C', fontWeight: '500', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  modalSave: { flex: 1, backgroundColor: '#000000', borderRadius: 12, paddingVertical: Spacing.three, alignItems: 'center' },
  modalSaveText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },

  chevronIcon: { fontSize: 20, color: '#9CA3AF', lineHeight: 20 },
});
