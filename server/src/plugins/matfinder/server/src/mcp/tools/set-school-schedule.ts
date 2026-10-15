import { classType, day, hhmm, liveOutput, slug, str, style, z } from '../schemas';
import { schoolService, type ToolDef, type Path } from '../types';

const FIELD = { startTime: 'start', endTime: 'end' } as Record<string, string>;

export const setSchoolSchedule: ToolDef = {
  name: 'set_school_schedule',
  title: 'Set a school schedule',
  description:
    "Replace a school's ENTIRE weekly class schedule (published right away): send the complete week every time, because sessions you leave out are removed. Times are 24-hour HH:mm in the city's local time; end must be after start. At most 100 sessions.",
  write: true,
  publishes: 'api::school.school',
  input: z.object({
    slug,
    sessions: z
      .array(z.object({ day, start: hhmm, end: hhmm, classType, style, notes: str.nullable().optional() }))
      .max(100),
  }),
  output: z.object({ slug: z.string(), sessionCount: z.number(), byDay: z.record(z.string(), z.number()), ...liveOutput }),
  shrinkHint: 'The result is too large.',
  // The schedule-validate middleware reports the stored field (schedule.0.endTime); name the tool's input instead.
  mapPath: (path: Path) => (path[0] === 'schedule' ? ['sessions', ...path.slice(1).map((p) => FIELD[p as string] ?? p)] : path),
  run: (strapi, args) => schoolService(strapi).setScheduleDraft(args.slug, args.sessions),
};
