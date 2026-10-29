/** Problem reports: what a user can report and the open limit. Pure, so it's unit-tested apart from Strapi. */
export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
export type ReportStatus = 'open' | 'resolved';
export const REPORT_KINDS: ReportKind[] = ['schedule', 'price', 'closed', 'contact', 'other'];
/** At most this many open reports per user (stops one account flooding the board). */
export const MAX_OPEN_REPORTS_PER_USER = 10;
