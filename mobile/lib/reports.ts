import type { ReportKind } from './api/reports';

export const REPORT_KINDS: { value: ReportKind; label: string }[] = [
  { value: 'schedule', label: 'Schedule is wrong' },
  { value: 'price', label: 'Price is wrong' },
  { value: 'closed', label: 'Closed or moved' },
  { value: 'contact', label: 'Contact details are wrong' },
  { value: 'other', label: 'Something else' },
];

/** What to tell the user when the server refuses a report (ApiError.code). */
export function reportErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'REPORT_OPEN':
      return "You already reported a problem with this gym. We'll look at it soon.";
    case 'TOO_MANY_REPORTS':
      return "You have several open reports. We'll get to them first.";
    default:
      return fallback;
  }
}

/** "Something else" needs a message; the other kinds speak for themselves. */
export function messageProblem(kind: ReportKind, message: string): string | null {
  return kind === 'other' && !message.trim() ? "Tell us what's wrong." : null;
}
