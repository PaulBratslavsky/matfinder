import { Status, Typography } from '@strapi/design-system';
import { STATUS_LABELS, type GymStatus } from '../status';

/** A gym's publish status, drawn like the Content Manager's status column (Published, Modified, Draft). */
export function GymStatusPill({ status }: { status: GymStatus }) {
  const { label, variant } = STATUS_LABELS[status];
  return (
    <Status size="S" variant={variant} maxWidth="min-content">
      <Typography tag="span" variant="omega" fontWeight="bold">
        {label}
      </Typography>
    </Status>
  );
}
