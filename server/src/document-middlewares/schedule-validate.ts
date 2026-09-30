import session from '../components/schedule/session.json';
import { toMinutes } from '../lib/time';
import { reject, writeData, type DocumentMiddleware, type Path } from './utils';

export const MAX_SESSIONS = 100;

const ENUMS: Record<string, string[]> = {
  day: session.attributes.day.enum,
  classType: session.attributes.classType.enum,
  style: session.attributes.style.enum,
};

/** The first problem in a school's `schedule`, or null when it's valid (or being cleared). */
export function scheduleProblem(schedule: unknown): { message: string; path: Path } | null {
  if (schedule == null) return null;
  if (!Array.isArray(schedule)) return { message: 'must be a list of sessions', path: ['schedule'] };
  if (schedule.length > MAX_SESSIONS) return { message: `at most ${MAX_SESSIONS} sessions`, path: ['schedule'] };

  for (const [i, row] of schedule.entries()) {
    if (!row || typeof row !== 'object') return { message: 'must be a session', path: ['schedule', i] };
    for (const [field, allowed] of Object.entries(ENUMS)) {
      if (!allowed.includes(row[field])) {
        return { message: `must be one of ${allowed.join(', ')}`, path: ['schedule', i, field] };
      }
    }
    const start = toMinutes(row.startTime);
    if (start === null) return { message: 'must be a time of day (HH:mm:ss.SSS)', path: ['schedule', i, 'startTime'] };
    const end = toMinutes(row.endTime);
    if (end === null) return { message: 'must be a time of day (HH:mm:ss.SSS)', path: ['schedule', i, 'endTime'] };
    if (end <= start) return { message: 'must be after startTime', path: ['schedule', i, 'endTime'] };
  }
  return null;
}

export const scheduleValidate: DocumentMiddleware = async (ctx, next) => {
  const data = ctx.uid === 'api::school.school' ? writeData(ctx) : undefined;
  if (data && 'schedule' in data) {
    const problem = scheduleProblem(data.schedule);
    if (problem) reject(problem.message, problem.path);
  }
  return next();
};
