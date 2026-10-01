import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';

/** Search by name, neighborhood, ZIP or team. Typing is local; the URL updates after a short pause. */
export function SearchBar({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value);
  // When the URL changes from outside (back button, "Clear"), show its value: adjust state during render.
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
    <View className="relative justify-center">
      <Icon as={Search} className="absolute left-3 z-10 size-4 text-muted-foreground" />
      <Input
        value={text}
        onChangeText={setText}
        placeholder="Search schools, neighborhoods, ZIP"
        accessibilityLabel="Search schools"
        autoCorrect={false}
        returnKeyType="search"
        className="bg-background pl-9 pr-9"
      />
      {!!text && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => {
            setText('');
            onChange('');
          }}
          className="absolute right-2 p-1">
          <Icon as={X} className="size-4 text-muted-foreground" />
        </Pressable>
      )}
    </View>
  );
}
