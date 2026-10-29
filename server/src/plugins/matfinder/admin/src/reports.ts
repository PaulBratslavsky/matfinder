export type ReportStatus = 'open' | 'resolved';
export type ReportKind = 'schedule' | 'price' | 'closed' | 'contact' | 'other';
export type Report = {
  documentId: string; schoolDocumentId: string; schoolSlug: string; schoolName: string;
  kind: ReportKind; message: string | null; status: ReportStatus;
  adminNote: string | null; resolvedBy: string | null; resolvedAt: string | null; createdAt: string;
};
export const KIND_LABELS: Record<ReportKind, string> = {
  schedule: 'Schedule is wrong',
  price: 'Price is wrong',
  closed: 'Closed or moved',
  contact: 'Contact details are wrong',
  other: 'Something else',
};
