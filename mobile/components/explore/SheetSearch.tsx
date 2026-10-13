import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** The sheet's search field. Typing is local; the URL (?q=) updates after a short pause. */
export function SheetSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
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
      <Ionicons name="search" size={18} color={colors.textDim} />
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Gym, neighborhood, ZIP or team"
        placeholderTextColor={colors.textDim}
        accessibilityLabel="Search gyms"
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
            <Ionicons name="close" size={12} color={colors.bg} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginHorizontal: t.layout.gutter,
    paddingHorizontal: 14,
    borderRadius: t.radii.field,
    backgroundColor: t.colors.field,
    borderWidth: 1,
    borderColor: t.colors.fieldBorder,
  },
  input: { ...t.type.body, flex: 1, minWidth: 0, fontSize: 16, color: t.colors.text, paddingVertical: 0, outlineWidth: 0 },
  clear: { width: 18, height: 18, borderRadius: 9, backgroundColor: t.colors.textDim, alignItems: 'center', justifyContent: 'center' },
}));
