import { ScrollView, Text, View } from 'react-native';
import { RankBar, SectionTitle } from '@/components/kit';
import { makeStyles } from '@/theme/ThemeProvider';

// Owner to review before deploy. Facts from docs/designs/matfinder/03-requirements.md › Privacy and the code; not legal
// text. Change it whenever what the app stores or sends changes.
const UPDATED = '2026-10-29';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Without an account',
    body: [
      'You can use the map, search and next sessions without an account. MatFinder keeps nothing about you then.',
      'Your light or dark setting is saved on your device only.',
      'Requests pass through our hosting providers, Strapi Cloud (the server) and Vercel (the web app), which keep their own request logs.',
    ],
  },
  {
    title: 'Your location',
    body: [
      'If you allow it, your location centers the map and shows how far each gym is. It is used on your device and is not sent to MatFinder’s server.',
      'The map comes from Mapbox, so Mapbox sees which area of the map you are looking at.',
    ],
  },
  {
    title: 'Your account',
    body: [
      'A free account shows full gym pages. It holds your name, your email and your password, which is stored only as a hash.',
      'A cookie (in the phone app, secure storage on your device) keeps you signed in for up to 30 days. Each sign-in is stored with your IP address and your browser or device type.',
    ],
  },
  {
    title: 'Claiming a gym',
    body: ['If you claim a gym, MatFinder keeps the name, email, phone number, role and message you send, so an admin can check you run it. Only MatFinder admins see them.'],
  },
  {
    title: 'Saved gyms and problem reports',
    body: [
      'Gyms you save are stored with your account so you can find them again.',
      'If you report a problem with a gym, MatFinder keeps the gym, the kind of problem and your message, linked to your account. Only MatFinder admins see reports.',
    ],
  },
  {
    title: 'Ask about this gym',
    body: [
      'When it is available, your questions and the chat so far are sent to Anthropic, whose AI model writes the answers.',
      'MatFinder’s logs record that you asked about a gym, but not what you asked.',
    ],
  },
  {
    title: 'What MatFinder doesn’t have',
    body: ['There is no analytics or advertising code in the app, and MatFinder sends you no email.'],
  },
  {
    title: 'Deleting your account',
    body: [
      'Go to Account, then Delete account. It removes your account and your saved gyms, and signs you out on every device. Claims still waiting for review are withdrawn, and your name, email and phone number are removed from every claim you made; a claim already accepted stays until an admin removes it. Reports you sent that are still open are deleted; resolved ones are kept without anything linking them to you. It can’t be undone.',
    ],
  },
];

export default function PrivacyScreen() {
  const styles = useStyles();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <RankBar stripes={2} width={52} />
      <Text role="heading" style={styles.title}>
        Privacy
      </Text>
      <Text style={styles.updated}>Last updated {UPDATED}</Text>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <SectionTitle>{s.title}</SectionTitle>
          {s.body.map((p) => (
            <Text key={p} style={styles.body}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: t.layout.gutter, paddingBottom: 48, gap: 16 },
  title: { ...t.type.display, fontSize: 34, lineHeight: 36, color: t.colors.text, marginTop: 8 },
  updated: { ...t.type.body, fontSize: 13, color: t.colors.textSecondary },
  section: { gap: 6 },
  body: { ...t.type.body, fontSize: 15, lineHeight: 22, color: t.colors.textSecondary },
}));
