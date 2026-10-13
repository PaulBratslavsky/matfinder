import { reject, writeData, type DocumentMiddleware, type Path } from './utils';

const FEES = ['dropInFee', 'monthlyMin', 'monthlyMax'] as const;

const isSet = (value: unknown) => value !== null && value !== undefined && value !== '';

/** The first problem in a school's `pricing`, or null when it's valid. */
export function pricingProblem(pricing: unknown): { message: string; path: Path } | null {
  if (!pricing || typeof pricing !== 'object') return null;
  const p = pricing as Record<string, unknown>;
  for (const fee of FEES) {
    if (isSet(p[fee]) && !(Number(p[fee]) >= 0)) return { message: 'must be 0 or more', path: ['pricing', fee] };
  }
  if (isSet(p.monthlyMin) && isSet(p.monthlyMax) && Number(p.monthlyMax) < Number(p.monthlyMin)) {
    return { message: 'must be at least monthlyMin', path: ['pricing', 'monthlyMax'] };
  }
  return null;
}

export const pricingValidate: DocumentMiddleware = async (ctx, next) => {
  const data = ctx.uid === 'api::school.school' ? writeData(ctx) : undefined;
  if (data && 'pricing' in data) {
    const problem = pricingProblem(data.pricing);
    if (problem) reject(problem.message, problem.path);
  }
  return next();
};
