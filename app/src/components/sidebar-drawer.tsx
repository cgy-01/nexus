import { Animated, PanResponder, StyleSheet } from 'react-native';

import SidebarPanel from '@/components/sidebar';
import type { Session } from '@/types/chat';

interface SidebarDrawerProps {
  animValue: Animated.Value;
  width: number;
  sessions: Session[];
  onSessionPress?: (sessionId: string) => void;
  onClose?: () => void;
}

export default function SidebarDrawer({
  animValue,
  width,
  sessions,
  onSessionPress,
  onClose,
}: SidebarDrawerProps) {
  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
  });
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dx < -12 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
    ),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -50 || gesture.vx < -0.4) {
        onClose?.();
      }
    },
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.container, { width, transform: [{ translateX }] }]}
    >
      <SidebarPanel
        width={width}
        sessions={sessions}
        onSessionPress={onSessionPress}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 200,
  },
});
