import { Image } from 'expo-image';
import { ScrollView } from 'react-native';
import type { Media } from '@/lib/api/schools';
import { mediaUrl } from '@/lib/media';

export function Gallery({ images }: { images: Media[] }) {
  if (!images.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {images.map((m, i) => (
        <Image
          key={`${m.url}-${i}`}
          source={{ uri: mediaUrl(m.formats?.small?.url ?? m.url) ?? undefined }}
          accessibilityLabel={m.alternativeText ?? 'School photo'}
          style={{ width: 220, height: 150, borderRadius: 12 }}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}
