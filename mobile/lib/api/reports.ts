import { apiPost } from './client';

export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
export type NewReport = { schoolSlug: string; kind: ReportKind; message?: string };

/** Report a problem with a gym (MatFinder plugin, account only). Throws ApiError with code REPORT_OPEN… */
export function createReport(report: NewReport): Promise<{ status: 'open' }> {
  return apiPost('/api/matfinder/reports', report);
}
