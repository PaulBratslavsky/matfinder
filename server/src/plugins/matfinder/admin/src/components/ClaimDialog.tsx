import { Button, Field, Modal, Textarea, Typography } from '@strapi/design-system';
import { useState } from 'react';
import { ACTION_COPY, type Claim, type ClaimAction } from '../claims';

/** Confirms a claim action, with a note (required for reject and remove owner). Closes only when the action succeeds. */
export function ClaimDialog({
  claim,
  action,
  onClose,
  onConfirm,
}: {
  claim: Claim;
  action: ClaimAction;
  onClose: () => void;
  onConfirm: (note: string) => Promise<boolean>;
}) {
  const copy = ACTION_COPY[action];
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const missing = copy.noteRequired && !note.trim();
  return (
    <Modal.Root open onOpenChange={(open: boolean) => !open && !busy && onClose()}>
      <Modal.Content onInteractOutside={(e: Event) => e.preventDefault()}>
        <Modal.Header>
          <Modal.Title>{copy.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Typography tag="p" variant="omega" textColor="neutral800">
            {claim.name} for {claim.schoolName}.
          </Typography>
          <Typography tag="p" variant="pi" textColor="neutral600" style={{ marginTop: 8, marginBottom: 16 }}>
            {copy.hint}
          </Typography>
          <Field.Root name="note" required={copy.noteRequired} hint="Only admins see it.">
            <Field.Label>Note{copy.noteRequired ? '' : ' (optional)'}</Field.Label>
            <Textarea value={note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} />
            <Field.Hint />
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={action === 'reject' || action === 'remove-owner' ? 'danger-light' : 'default'}
            disabled={missing || busy}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const done = await onConfirm(note.trim());
              setBusy(false);
              if (done) onClose();
            }}
          >
            {copy.confirm}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
