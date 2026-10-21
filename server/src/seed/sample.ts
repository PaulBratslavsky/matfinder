/**
 * Development-only sample data (SEED_SAMPLE_DATA=true): one city, 3 affiliations, 6 instructors, 8 clearly
 * fictional "Sample … (Demo)" schools that cover every filter and empty state in the app, and a few gym knowledge
 * entries for the gym chat. Idempotent: everything is
 * upserted by slug through the services (so the Document Service middlewares run), and a document is only written
 * or re-published when it differs, so a second boot changes nothing. No end-user accounts are seeded.
 */
import type { Core } from '@strapi/strapi';
import type { ScheduleInput, UpsertSchoolInput } from '../api/school/services/school';

const CITY = {
  name: 'Las Vegas',
  slug: 'las-vegas',
  state: 'NV',
  country: 'US',
  timezone: 'America/Los_Angeles',
  center: { longitude: -115.1398, latitude: 36.1699, address: 'Las Vegas, NV', zoom: 10.5, pitch: 0, bearing: 0 },
  defaultZoom: 10.5,
};

const AFFILIATIONS = [
  { slug: 'sample-team-alpha-demo', name: 'Sample Team Alpha (Demo)', website: 'https://example.com/team-alpha' },
  { slug: 'sample-team-beta-demo', name: 'Sample Team Beta (Demo)', website: 'https://example.com/team-beta' },
  { slug: 'independent', name: 'Independent', website: null },
];

const INSTRUCTORS = [
  { slug: 'sample-coach-ana-demo', name: 'Sample Coach Ana (Demo)', beltRank: 'black', degree: 3, bio: 'Fictional head coach for demo data.' },
  { slug: 'sample-coach-ben-demo', name: 'Sample Coach Ben (Demo)', beltRank: 'black', degree: 1, bio: 'Fictional competition coach.' },
  { slug: 'sample-coach-cruz-demo', name: 'Sample Coach Cruz (Demo)', beltRank: 'brown', degree: 2, bio: 'Fictional no-gi specialist.' },
  { slug: 'sample-coach-dee-demo', name: 'Sample Coach Dee (Demo)', beltRank: 'purple', degree: 4, bio: "Fictional kids' program lead." },
  { slug: 'sample-coach-eli-demo', name: 'Sample Coach Eli (Demo)', beltRank: 'red_black', degree: 7, bio: 'Fictional senior instructor.' },
  { slug: 'sample-coach-fay-demo', name: 'Sample Coach Fay (Demo)', beltRank: 'blue', degree: 2, bio: "Fictional women's class instructor." },
];

type SampleSchool = UpsertSchoolInput & { slug: string; sessions: ScheduleInput[] };

const s = (day: string, start: string, end: string, classType: string, style: string, notes?: string): ScheduleInput => ({
  day,
  start,
  end,
  classType,
  style,
  ...(notes ? { notes } : {}),
});

// Fixed dates keep the seed idempotent. The stale one is well over 90 days old.
const RECENT = '2026-09-15';
const STALE = '2026-05-01';

/**
 * Coverage: an evening open mat every day (mon: Summerlin, tue: Henderson, wed: Strip, thu: North LV, fri: Spring
 * Valley, sat: Centennial, sun: Strip + Garage); visitors yes/no; gi-only, no-gi-only and both; kids and womens;
 * varied prices; one school with no instructors or amenities; one verified over 90 days ago.
 */
const SCHOOLS: SampleSchool[] = [
  {
    slug: 'sample-summerlin-bjj-demo',
    name: 'Sample Summerlin BJJ (Demo)',
    neighborhood: 'Summerlin',
    postalCode: '89135',
    address: '100 Sample Ridge Dr, Las Vegas, NV 89135',
    latitude: 36.1826,
    longitude: -115.312,
    affiliationSlug: 'sample-team-alpha-demo',
    headInstructorSlugs: ['sample-coach-ana-demo', 'sample-coach-ben-demo'],
    shortDescription: 'Fictional family academy with gi and no-gi classes every day.',
    descriptionText: 'This is sample data for development.\n\nGi and no-gi classes, a kids program and a weekly women-only class.',
    pricing: { visitorsWelcome: true, dropInFee: 25, freeTrial: true, freeTrialNotes: 'First class free', monthlyMin: 150, monthlyMax: 200 },
    contact: { phone: '702-555-0101', website: 'example.com/summerlin-bjj', instagram: '@sample_summerlin_bjj' },
    amenities: { showers: true, changingRooms: true, parking: true, giRental: true, proShop: true, kidsArea: true, airConditioning: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('mon', '06:00', '07:00', 'fundamentals', 'gi'),
      s('mon', '19:00', '20:30', 'open_mat', 'both', 'Visitors welcome'),
      s('tue', '16:30', '17:15', 'kids', 'gi', 'Ages 6–12'),
      s('wed', '12:00', '13:00', 'all_levels', 'nogi'),
      s('thu', '16:30', '17:15', 'kids', 'gi', 'Ages 6–12'),
      s('sat', '09:00', '10:00', 'womens', 'gi'),
    ],
  },
  {
    slug: 'sample-henderson-grappling-demo',
    name: 'Sample Henderson Grappling (Demo)',
    neighborhood: 'Henderson',
    postalCode: '89014',
    address: '200 Sample Pkwy, Henderson, NV 89014',
    latitude: 36.0395,
    longitude: -115.0457,
    affiliationSlug: 'sample-team-beta-demo',
    headInstructorSlugs: ['sample-coach-cruz-demo'],
    shortDescription: 'Fictional no-gi only gym.',
    pricing: { visitorsWelcome: true, dropInFee: 20, monthlyMin: 130, monthlyMax: 130 },
    contact: { phone: '702-555-0102', instagram: 'https://www.instagram.com/sample_henderson_grappling/' },
    amenities: { showers: false, changingRooms: true, parking: true, airConditioning: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('mon', '18:00', '19:00', 'fundamentals', 'nogi'),
      s('tue', '19:00', '20:30', 'open_mat', 'nogi'),
      s('thu', '18:00', '19:30', 'advanced', 'nogi'),
    ],
  },
  {
    slug: 'sample-strip-jiu-jitsu-demo',
    name: 'Sample Strip Jiu-Jitsu (Demo)',
    neighborhood: 'Near the Strip',
    postalCode: '89109',
    address: '300 Sample Blvd, Las Vegas, NV 89109',
    latitude: 36.1147,
    longitude: -115.1728,
    affiliationSlug: 'independent',
    headInstructorSlugs: ['sample-coach-dee-demo'],
    shortDescription: 'Fictional gi-only academy popular with visiting grapplers.',
    pricing: { visitorsWelcome: true, dropInFee: 40, dropInNotes: 'Includes a loaner gi', monthlyMin: 220, monthlyMax: 260 },
    contact: { phone: '702-555-0103', website: 'https://example.com/strip-jj' },
    amenities: { showers: true, changingRooms: true, giRental: true, airConditioning: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('wed', '18:30', '20:00', 'open_mat', 'gi'),
      s('fri', '12:00', '13:00', 'all_levels', 'gi'),
      s('sun', '17:00', '18:30', 'open_mat', 'gi'),
    ],
  },
  {
    slug: 'sample-north-las-vegas-academy-demo',
    name: 'Sample North Las Vegas Academy (Demo)',
    neighborhood: 'North Las Vegas',
    postalCode: '89030',
    address: '400 Sample Ave, North Las Vegas, NV 89030',
    latitude: 36.1989,
    longitude: -115.1175,
    affiliationSlug: 'sample-team-alpha-demo',
    headInstructorSlugs: ['sample-coach-eli-demo'],
    shortDescription: 'Fictional members-only academy.',
    pricing: { visitorsWelcome: false, monthlyMin: 120, monthlyMax: 160 },
    contact: { phone: '702-555-0104' },
    amenities: { parking: true, kidsArea: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('mon', '16:30', '17:30', 'kids', 'gi'),
      s('wed', '16:30', '17:30', 'kids', 'gi'),
      s('thu', '19:30', '21:00', 'open_mat', 'both'),
    ],
  },
  {
    slug: 'sample-spring-valley-fight-team-demo',
    name: 'Sample Spring Valley Fight Team (Demo)',
    neighborhood: 'Spring Valley',
    postalCode: '89147',
    address: '500 Sample Rd, Las Vegas, NV 89147',
    latitude: 36.108,
    longitude: -115.245,
    affiliationSlug: 'sample-team-beta-demo',
    headInstructorSlugs: ['sample-coach-ben-demo', 'sample-coach-cruz-demo'],
    shortDescription: 'Fictional competition-focused no-gi team.',
    pricing: { visitorsWelcome: true, dropInFee: 15, monthlyMin: 100, monthlyMax: 140 },
    contact: { phone: '702-555-0105', instagram: '@sample_svft' },
    amenities: { showers: true, parking: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('tue', '18:00', '19:30', 'competition', 'nogi'),
      s('fri', '18:00', '19:30', 'open_mat', 'nogi', 'Competition prep rounds'),
    ],
  },
  {
    slug: 'sample-centennial-hills-bjj-demo',
    name: 'Sample Centennial Hills BJJ (Demo)',
    neighborhood: 'Centennial Hills',
    postalCode: '89149',
    address: '600 Sample Ln, Las Vegas, NV 89149',
    latitude: 36.27,
    longitude: -115.265,
    affiliationSlug: 'independent',
    headInstructorSlugs: ['sample-coach-fay-demo', 'sample-coach-ana-demo'],
    shortDescription: 'Fictional gi academy with a women-only class.',
    pricing: { visitorsWelcome: false, monthlyMin: 180, monthlyMax: 240 },
    contact: { phone: '702-555-0106', website: 'example.com/centennial' },
    amenities: { changingRooms: true, airConditioning: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('tue', '10:00', '11:00', 'womens', 'gi', 'Women only'),
      s('thu', '06:00', '07:00', 'fundamentals', 'gi'),
      s('sat', '17:00', '18:30', 'open_mat', 'gi'),
    ],
  },
  {
    // Empty sections: no affiliation, no instructors, no amenities. Also the stale listing (> 90 days).
    slug: 'sample-garage-grappling-demo',
    name: 'Sample Garage Grappling (Demo)',
    neighborhood: 'Summerlin',
    postalCode: '89144',
    address: '700 Sample Ct, Las Vegas, NV 89144',
    latitude: 36.154,
    longitude: -115.328,
    shortDescription: 'Fictional garage open mat.',
    pricing: { visitorsWelcome: true, dropInFee: 0, dropInNotes: 'Free, bring water' },
    contact: { instagram: '@sample_garage_grappling' },
    lastVerifiedAt: STALE,
    sessions: [s('sun', '18:00', '20:00', 'open_mat', 'both')],
  },
  {
    slug: 'sample-green-valley-grappling-demo',
    name: 'Sample Green Valley Grappling (Demo)',
    neighborhood: 'Henderson',
    postalCode: '89074',
    address: '800 Sample Green Dr, Henderson, NV 89074',
    latitude: 36.031,
    longitude: -115.085,
    affiliationSlug: 'independent',
    headInstructorSlugs: ['sample-coach-dee-demo'],
    shortDescription: 'Fictional gi and no-gi school.',
    pricing: { visitorsWelcome: true, dropInFee: 30, monthlyMin: 160, monthlyMax: 190 },
    contact: { phone: '702-555-0108' },
    amenities: { showers: true, parking: true, proShop: true },
    lastVerifiedAt: RECENT,
    sessions: [
      s('mon', '12:00', '13:00', 'all_levels', 'both'),
      s('wed', '19:00', '20:00', 'womens', 'nogi'),
      s('sat', '10:00', '11:00', 'kids', 'gi'),
    ],
  },
];

/**
 * Gym knowledge (plan 09): what the gym chat knows beyond a gym's page. Facts the page doesn't hold, so they never
 * contradict it; `school: null` entries apply to every gym.
 */
const KNOWLEDGE: { school: string | null; question: string; answer: string; category: string }[] = [
  {
    school: 'sample-summerlin-bjj-demo',
    question: 'Where do I park?',
    answer: 'Free parking in the lot behind the building. The spaces out front belong to the café next door.',
    category: 'visiting',
  },
  {
    school: 'sample-summerlin-bjj-demo',
    question: 'Can I borrow a gi for my first class?',
    answer: 'Yes. Loaner gis in most sizes are at the front desk for a first visit. Bring your own after that.',
    category: 'gear',
  },
  {
    school: 'sample-henderson-grappling-demo',
    question: 'Do I need to sign a waiver?',
    answer: 'Yes. Fill it in online before your first class, or arrive 10 minutes early to sign it at the desk.',
    category: 'policies',
  },
  {
    school: 'sample-strip-jiu-jitsu-demo',
    question: 'Are classes taught in English?',
    answer: 'Yes, every class is taught in English. Two of the coaches also speak Spanish.',
    category: 'visiting',
  },
  {
    school: 'sample-garage-grappling-demo',
    question: 'How do I find the entrance?',
    answer: "It's a converted two-car garage behind the house, with no sign. Knock on the side gate.",
    category: 'visiting',
  },
  {
    school: 'sample-green-valley-grappling-demo',
    question: 'From what age can kids join?',
    answer: "Kids' classes are for ages 5 to 12. Teens train in the regular fundamentals class.",
    category: 'kids',
  },
  {
    school: null,
    question: 'What should I bring to a first BJJ class?',
    answer:
      'Most gyms ask for a clean gi (or a rash guard and shorts for no-gi), a water bottle, flip-flops for walking off the mats, and trimmed nails. Ask the gym whether they lend gis.',
    category: 'gear',
  },
  {
    school: null,
    question: 'Do I need experience to drop in?',
    answer: 'Usually not. Tell the coach before class that you are new so they can pair you well, and expect to sign a waiver.',
    category: 'visiting',
  },
  {
    school: null,
    question: "What's the difference between gi and no-gi?",
    answer:
      'Gi classes are trained in the heavy jacket and pants, so you can grip the cloth. No-gi classes are in a rash guard and shorts, with no cloth grips and usually a faster pace.',
    category: 'gear',
  },
];

/** Writes and publishes each sample entry unless its published version already says the same. */
async function seedSampleKnowledge(strapi: Core.Strapi) {
  const docs = (uid: string) => strapi.documents(uid as any) as any;
  const knowledge = docs('plugin::matfinder.knowledge');
  for (const entry of KNOWLEDGE) {
    const school = entry.school ? await docs('api::school.school').findFirst({ status: 'draft', filters: { slug: entry.school }, fields: ['slug'] }) : null;
    if (entry.school && !school) continue;
    const scope = school ? { documentId: school.documentId } : { id: { $null: true } };
    const live = await knowledge.findFirst({ status: 'published', filters: { question: entry.question, school: scope }, fields: ['answer', 'category'] });
    if (live && live.answer === entry.answer && live.category === entry.category) continue;
    const draft = await knowledge.findFirst({ status: 'draft', filters: { question: entry.question, school: scope }, fields: ['question'] });
    const data = { question: entry.question, answer: entry.answer, category: entry.category, source: 'admin', school: school ? { set: [school.documentId] } : { set: [] } };
    const saved = draft ? await knowledge.update({ documentId: draft.documentId, status: 'draft', data }) : await knowledge.create({ data });
    await knowledge.publish({ documentId: saved.documentId });
  }
}

export async function seedSampleData(strapi: Core.Strapi) {
  const docs = (uid: string) => strapi.documents(uid as any) as any;
  const publishIfNeeded = async (uid: string, result: { documentId: string; status: string }) => {
    if (result.status !== 'published') await docs(uid).publish({ documentId: result.documentId });
  };

  // City: editorial and not draft-and-publish, so it's written directly.
  const { slug: citySlug, ...cityData } = CITY;
  const city = await docs('api::city.city').findFirst({ filters: { slug: citySlug } });
  if (!city) await docs('api::city.city').create({ data: { slug: citySlug, ...cityData } });

  for (const a of AFFILIATIONS) {
    await publishIfNeeded('api::affiliation.affiliation', await strapi.service('api::affiliation.affiliation' as any).upsertDraft(a));
  }
  for (const i of INSTRUCTORS) {
    await publishIfNeeded('api::instructor.instructor', await strapi.service('api::instructor.instructor' as any).upsertDraft(i));
  }

  const schools = strapi.service('api::school.school') as any;
  for (const { sessions, ...school } of SCHOOLS) {
    const upserted = await schools.upsertDraft({ ...school, citySlug });
    const current = await schools.getDraft(school.slug, 0);
    const same = (a: ScheduleInput, b: any) =>
      a.day === b.day && a.start === b.start && a.end === b.end && a.classType === b.classType && a.style === b.style && (a.notes ?? null) === b.notes;
    const unchanged = current.schedule.length === sessions.length && sessions.every((x) => current.schedule.some((y: any) => same(x, y)));
    if (!unchanged) await schools.setScheduleDraft(school.slug, sessions);
    await publishIfNeeded('api::school.school', { documentId: upserted.documentId, status: unchanged ? current.status : 'unpublished-changes' });
  }
  await seedSampleKnowledge(strapi);
  strapi.log.info(
    `[matfinder] sample data ready: ${AFFILIATIONS.length} affiliations, ${INSTRUCTORS.length} instructors, ${SCHOOLS.length} schools, ${KNOWLEDGE.length} knowledge entries (Demo)`,
  );
}
