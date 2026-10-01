import { AtSign, Camera, Globe, Phone } from 'lucide-react-native';
import { Linking, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { SchoolPage } from '@/lib/api/schools';
import { EmptyLine } from './Section';

export function ContactLinks({ contact }: { contact: SchoolPage['contact'] }) {
  const links = [
    contact?.phone && { icon: Phone, label: contact.phone, url: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
    contact?.email && { icon: AtSign, label: contact.email, url: `mailto:${contact.email}` },
    contact?.website && { icon: Globe, label: contact.website.replace(/^https?:\/\//, ''), url: contact.website },
    contact?.instagram && { icon: Camera, label: `@${contact.instagram}`, url: `https://instagram.com/${contact.instagram}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; url: string }[];
  if (!links.length) return <EmptyLine>No contact details listed.</EmptyLine>;
  return (
    <View className="gap-2">
      {links.map((l) => (
        <Pressable key={l.url} accessibilityRole="link" onPress={() => Linking.openURL(l.url)} className="flex-row items-center gap-2 py-1">
          <Icon as={l.icon} className="size-4 text-primary" />
          <Text className="text-sm text-primary underline">{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
