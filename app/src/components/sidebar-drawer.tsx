import { Animated, StyleSheet } from 'react-native';

import SidebarPanel, { type MenuSectionData } from '@/components/sidebar';

interface SidebarDrawerProps {
  /** Shared animated value: 0 = closed, 1 = open */
  animValue: Animated.Value;
  /** Drawer width in px */
  width: number;
  /** Sidebar menu sections */
  sections: MenuSectionData[];
  /** Callback when a session is tapped */
  onSessionPress?: (sessionId: string) => void;
}

export default function SidebarDrawer({ animValue, width, sections, onSessionPress }: SidebarDrawerProps) {
  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { width, transform: [{ translateX }] },
      ]}
    >
      <SidebarPanel width={width} sections={sections} onSessionPress={onSessionPress} />
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
