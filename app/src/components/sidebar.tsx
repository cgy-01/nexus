import { StyleSheet, View, Text, Platform, ScrollView, Pressable } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Star icon placeholder */
function StarIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.star}>
      <View style={[iconStyles.starBody, { backgroundColor: color }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  star: {
    width: 20,
    height: 20,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBody: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
  },
});

interface MenuItemData {
  id?: string;
  label: string;
  description: string;
}

export interface MenuSectionData {
  heading: string;
  items: MenuItemData[];
}

function MenuItem({
  id,
  label,
  description,
  color,
  secondaryColor,
  onPress,
}: MenuItemData & {
  color: string;
  secondaryColor: string;
  onPress?: (id: string) => void;
}) {
  const content = (
    <View style={menuStyles.item}>
      <StarIcon color={color} />
      <View style={menuStyles.itemBody}>
        <Text style={[menuStyles.itemLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[menuStyles.itemDesc, { color: secondaryColor }]} numberOfLines={1}>
          {description}
        </Text>
      </View>
    </View>
  );

  if (id && onPress) {
    return (
      <Pressable
        onPress={() => onPress(id)}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  itemBody: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  itemLabel: {
    fontSize: 20,
    lineHeight: 22,
    marginTop: 0,
    flex: 1,
    minWidth: 0,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    fontWeight: '500',
  },
  itemDesc: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    fontWeight: '400',
  },
});

function MenuSeparator() {
  return (
    <View style={separatorStyles.wrapper}>
      <View style={separatorStyles.line} />
    </View>
  );
}

const separatorStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    height: 1,
    backgroundColor: '#d9d9d9',
    width: '100%',
  },
});

function MenuSection({
  heading,
  items,
  color,
  secondaryColor,
  onItemPress,
}: MenuSectionData & {
  color: string;
  secondaryColor: string;
  onItemPress?: (id: string) => void;
}) {
  return (
    <View style={sectionStyles.root}>
      <View style={sectionStyles.header}>
        <Text style={[sectionStyles.headingText, { color: secondaryColor }]}>{heading}</Text>
      </View>
      <MenuSeparator />
      <View style={sectionStyles.items}>
        {items.map((item, i) => (
          <MenuItem key={i} {...item} color={color} secondaryColor={secondaryColor} onPress={onItemPress} />
        ))}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  root: {
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  headingText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    fontWeight: '400',
  },
  items: {
    width: '100%',
  },
});

interface SidebarProps {
  width: number;
  sections: MenuSectionData[];
  onSessionPress?: (sessionId: string) => void;
}

export default function SidebarPanel({ width, sections, onSessionPress }: SidebarProps) {
  const theme = useTheme();
  const textColor = theme.nexusBackground === '#1a1d24' ? '#ffffff' : '#000000';
  const secondaryColor = theme.nexusBackground === '#1a1d24' ? '#9CA3AF' : '#757575';

  return (
    <View style={[styles.root, { width, backgroundColor: theme.background }]}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={[styles.searchPlaceholder, { color: secondaryColor }]}>
          Search...
        </Text>
      </View>

      {/* Menu */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        <View style={styles.menuInner}>
          {sections.map((section, i) => (
            <MenuSection
              key={i}
              heading={section.heading}
              items={section.items}
              color={textColor}
              secondaryColor={secondaryColor}
              onItemPress={onSessionPress}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: '100%',
    paddingTop: 56, // below status bar
    paddingBottom: Spacing.four,
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    height: 53,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  searchPlaceholder: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  menu: {
    flex: 1,
    paddingHorizontal: Spacing.one,
  },
  menuInner: {
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
});
