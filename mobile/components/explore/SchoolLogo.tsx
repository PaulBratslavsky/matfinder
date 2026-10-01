import { Image } from 'expo-image';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

/** "Sample Summerlin BJJ (Demo)" → "SS". */
export function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}

/** The school's logo, or its initials when it has none. */
export function SchoolLogo({ name, url, size = 48, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const src = mediaUrl(url);
  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-lg bg-secondary', className)}
      style={{ width: size, height: size }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Text className="font-semibold text-secondary-foreground" style={{ fontSize: size * 0.36 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
