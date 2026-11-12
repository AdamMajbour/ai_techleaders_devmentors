export const VAULT_NOTICE_VERSION = 'working-draft-1';
export const VAULT_NOTICE_DRAFT_LABEL = 'Working text, waiting for legal review (E03-T02).';

export const VAULT_NOTICE_ITEMS = [
  'This note is sent to an AI provider every time a seeker asks a question that the AI answers from the vault, not only questions about this note.',
  'The AI writes the answer. You do not.',
  'Until 14 December 2026 you see every answer that cites your note before the seeker does.',
  'The seeker sees your name and the title of the note.',
  'You earn 80% of 10 EUR, split equally among the mentors whose notes are cited. Payout is not available yet.',
  'You can take the note down at any time. That rejects answers waiting for review. It does not withdraw answers that were already released.',
] as const;
