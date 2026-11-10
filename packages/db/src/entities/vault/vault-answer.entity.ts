import { defineDomainEntity, p, type InferEntity } from '../define';

export const VaultAnswer = defineDomainEntity({
  name: 'VaultAnswer',
  tableName: 'vault_answers',
  properties: {
    seekerId: p.uuid(),
    question: p.text(),
    status: p.string(),
    priceMinor: p.integer(),
    currency: p.string(),
    answerText: p.text().nullable(),
    failureReason: p.string().nullable(),
    modelId: p.string().nullable(),
    inputTokens: p.integer().nullable(),
    outputTokens: p.integer().nullable(),
    generationAttempts: p.integer().default(0),
    generationStartedAt: p.datetime().nullable(),
    previewRequired: p.boolean().default(true),
    reviewExpiresAt: p.datetime().nullable(),
  },
});

export type VaultAnswer = InferEntity<typeof VaultAnswer>;
