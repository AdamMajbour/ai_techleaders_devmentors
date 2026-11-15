import { defineDomainEntity, p, type InferEntity } from '../define';

export const VaultAnswerCitation = defineDomainEntity({
  name: 'VaultAnswerCitation',
  tableName: 'vault_answer_citations',
  properties: {
    answerId: p.uuid(),
    noteId: p.uuid(),
    mentorId: p.uuid(),
    mentorName: p.string(),
    noteTitle: p.string(),
    position: p.integer(),
  },
});

export type VaultAnswerCitation = InferEntity<typeof VaultAnswerCitation>;
