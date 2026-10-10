import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { IOS } from './ios';

/** metravel-explore's sheet search bar. Typing is local; the URL (?q=) updates after a short pause. */
export function SheetSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value);
  // When the URL changes from outside (back button, "Clear filters"), show its value: adjust state during render.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  useEffect(() => {
    if (text === value) return;
    const id = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(id);
  }, [text, value, onChange]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={16} color={IOS.secondaryLabel} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Search schools, neighborhoods, ZIP"
        placeholderTextColor={IOS.secondaryLabel}
        accessibilityLabel="Search schools"
        autoCorrect={false}
        returnKeyType="search"
      />
      {!!text && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => {
            setText('');
            onChange('');
          }}>
          <View style={styles.clear}>
            <Ionicons name="close" size={10} color={IOS.white} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IOS.fill,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  icon: { marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: IOS.label, paddingVertical: 0, outlineStyle: 'none' } as any,
  clear: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
});
