/** Claims: labels and what each state allows, for the board and the widget. */
export type ClaimStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'withdrawn';
export type ClaimAction = 'contacted' | 'accept' | 'reject' | 'remove-owner';

export type Claim = {
  documentId: string;
  schoolDocumentId: string;
  schoolSlug: string;
  schoolName: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'head_instructor' | 'staff';
  message: string | null;
  status: ClaimStatus;
  adminNote: string | null;
  handledBy: string | null;
  contactedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export const ROLE_LABELS: Record<Claim['role'], string> = {
  owner: 'Owner',
  manager: 'Manager',
  head_instructor: 'Head instructor',
  staff: 'Staff',
};

export const STATUS: Record<ClaimStatus, { label: string; variant: 'warning' | 'secondary' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'New', variant: 'warning' },
  contacted: { label: 'Contacted', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  withdrawn: { label: 'Owner removed', variant: 'neutral' },
};

/** The actions a claim in `status` offers, in button order. */
export function actionsFor(status: ClaimStatus): ClaimAction[] {
  if (status === 'pending') return ['contacted', 'accept', 'reject'];
  if (status === 'contacted') return ['accept', 'reject'];
  if (status === 'accepted') return ['remove-owner'];
  return [];
}

export const ACTION_COPY: Record<ClaimAction, { button: string; title: string; hint: string; confirm: string; noteRequired: boolean }> = {
  contacted: {
    button: 'Mark contacted',
    title: 'Mark as contacted',
    hint: "You reached the owner and are confirming who they are. The account email isn't verified, so confirm by phone. Note how (call, email) and what you agreed.",
    confirm: 'Mark contacted',
    noteRequired: false,
  },
  accept: {
    button: 'Accept',
    title: 'Accept this claim',
    hint: 'The gym shows "Claimed by the owner" in the app. Any other open claims for this gym are closed.',
    confirm: 'Accept claim',
    noteRequired: false,
  },
  reject: {
    button: 'Reject',
    title: 'Reject this claim',
    hint: "Say why, for the record (for example: couldn't confirm they work there). The owner isn't notified automatically.",
    confirm: 'Reject claim',
    noteRequired: true,
  },
  'remove-owner': {
    button: 'Remove owner',
    title: 'Remove the owner',
    hint: 'The gym is no longer marked as claimed, and someone else can claim it. Say why.',
    confirm: 'Remove owner',
    noteRequired: true,
  },
};

/** "3 h ago", "2 days ago". */
export function age(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
