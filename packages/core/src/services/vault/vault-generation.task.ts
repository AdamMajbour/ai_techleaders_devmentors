import type { VaultAnswerRepository } from '@devmentor/db';
import type { AnswerGenerator, GeneratorErrorKind } from '../ai/answer-generator.port';
import { GeneratorError } from '../ai/answer-generator.port';
import { validateGeneration } from '../ai/validate-generation';
import type { NoteSelector } from './note-selector';
import type { Clock } from '../../utils/clock';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import { VAULT_GENERATION_LEASE_MS, VAULT_MAX_CITATIONS, VAULT_MAX_GENERATION_ATTEMPTS, VAULT_PREVIEW_WINDOW_MINUTES } from '../../constants';
import type { VaultReleaseService } from './vault-release.service';

type Dependencies = {
  vaultAnswerRepository: Pick<VaultAnswerRepository, 'findForGeneration' | 'findById' | 'claimGeneration' | 'scheduleGenerationRetry' | 'transition' | 'updateAnswer' | 'persistGenerated' | 'failGenerationWithRefund'>;
  vaultReleaseService: Pick<VaultReleaseService, 'release'>;
  noteSelector: Pick<NoteSelector, 'selectFor'>;
  answerGenerator: AnswerGenerator;
  eventBus: EventBus;
  logger: Logger;
  clock: Clock;
};

const retryableKinds = new Set<GeneratorErrorKind>(['unavailable', 'invalid_output']);

/** Generates paid answers, persisting validated output and citation/reviewer snapshots before exposure. */
export class VaultGenerationTask {
  readonly name = 'vault-answers.generate';
  readonly taskClass = 'external' as const;

  constructor(private readonly dependencies: Dependencies) {}

  async run({ limit }: { limit: number }): Promise<{ processed: number }> {
    const candidates = await this.dependencies.vaultAnswerRepository.findForGeneration(limit);
    let processed = 0;
    for (const candidate of candidates) {
      const now = this.dependencies.clock.now();
      if (!(await this.dependencies.vaultAnswerRepository.claimGeneration(candidate.id, now, VAULT_GENERATION_LEASE_MS))) {
        const stale = candidate.status === 'generating' && candidate.generationAttempts >= VAULT_MAX_GENERATION_ATTEMPTS &&
          (!candidate.generationStartedAt || candidate.generationStartedAt.getTime() < now.getTime() - VAULT_GENERATION_LEASE_MS);
        if (stale) {
          const failed = await this.dependencies.vaultAnswerRepository.failGenerationWithRefund(candidate.id, 'unavailable', now);
          if (failed.changed) {
            processed += 1;
            await this.dependencies.eventBus.emit('vault.answer.failed', { answerId: candidate.id });
          }
        }
        continue;
      }
      processed += 1;
      const answer = await this.dependencies.vaultAnswerRepository.findById(candidate.id);
      if (!answer) continue;
      let validated: ReturnType<typeof validateGeneration>;
      let notes: Awaited<ReturnType<NoteSelector['selectFor']>>;
      try {
        notes = await this.dependencies.noteSelector.selectFor(answer.seekerId);
        if (notes.length === 0) throw new GeneratorError('unanswerable');
        const generated = await this.dependencies.answerGenerator.generate({ question: answer.question, notes });
        validated = validateGeneration(generated, notes, { maxCitations: VAULT_MAX_CITATIONS });
      } catch (error) {
        const kind: GeneratorErrorKind = error instanceof GeneratorError ? error.kind : 'unavailable';
        const attempts = answer.generationAttempts;
        const maxAttempts = kind === 'invalid_output' ? 2 : VAULT_MAX_GENERATION_ATTEMPTS;
        if (retryableKinds.has(kind) && attempts < maxAttempts) {
          const delay = Math.min(60_000 * 2 ** (attempts - 1), 15 * 60_000);
          await this.dependencies.vaultAnswerRepository.scheduleGenerationRetry(answer.id, now, delay);
          this.dependencies.logger.warn('Vault answer generation will retry.', { answerId: answer.id, attempt: attempts, failureReason: kind });
          continue;
        }
        const failed = await this.dependencies.vaultAnswerRepository.failGenerationWithRefund(answer.id, kind, now);
        if (failed.changed) await this.dependencies.eventBus.emit('vault.answer.failed', { answerId: answer.id });
        continue;
      }
      {
        const citations = validated.citationIds.map((id, position) => {
          const note = notes.find((item) => item.id === id);
          if (!note) throw new GeneratorError('invalid_output');
          return { answerId: answer.id, noteId: note.id, mentorId: note.mentorId, mentorName: note.mentorName, noteTitle: note.title, position };
        });
        const previewRequired = answer.previewRequired;
        const reviewerIds = previewRequired ? [...new Set(citations.map((citation) => citation.mentorId))] : [];
        const changed = await this.dependencies.vaultAnswerRepository.persistGenerated({
          answerId: answer.id,
          answerText: validated.answer,
          modelId: validated.modelId,
          inputTokens: validated.inputTokens,
          outputTokens: validated.outputTokens,
          citations,
          reviewerIds,
          reviewExpiresAt: previewRequired ? new Date(now.getTime() + VAULT_PREVIEW_WINDOW_MINUTES * 60_000) : null,
          now,
          directRelease: !previewRequired,
        });
        if (changed) await this.dependencies.eventBus.emit('vault.answer.generated', { answerId: answer.id });
        if (changed && !previewRequired) await this.dependencies.vaultReleaseService.release(answer.id);
      }
    }
    return { processed };
  }
}
