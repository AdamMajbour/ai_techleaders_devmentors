import type { NoteRepository, UserRepository } from '@devmentor/db';
import type { Logger } from '../../logger';
import { VAULT_MAX_CORPUS_CHARS } from '../../constants/vault';
import type { AnswerSourceNote } from '../ai/answer-generator.port';

export interface SelectedVaultNote extends AnswerSourceNote {
  readonly mentorId: string;
}

type Dependencies = {
  noteRepository: Pick<NoteRepository, 'findVaultCorpus'>;
  userRepository: Pick<UserRepository, 'findByIds'>;
  logger: Logger;
  maxCorpusChars?: number;
};

/** Selects consented published notes, excludes the buyer's own notes, and preserves a deterministic corpus. */
export class NoteSelector {
  private readonly maxCorpusChars: number;

  constructor(private readonly dependencies: Dependencies) {
    this.maxCorpusChars = dependencies.maxCorpusChars ?? VAULT_MAX_CORPUS_CHARS;
  }

  async selectFor(seekerId: string): Promise<SelectedVaultNote[]> {
    const candidates = await this.dependencies.noteRepository.findVaultCorpus(seekerId);
    const users = await this.dependencies.userRepository.findByIds([...new Set(candidates.map((note) => note.mentorId))]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const selected: SelectedVaultNote[] = [];
    let totalChars = 0;
    let omitted = 0;
    for (const note of candidates) {
      const mentor = usersById.get(note.mentorId);
      if (!mentor) {
        omitted += 1;
        continue;
      }
      if (totalChars + note.body.length > this.maxCorpusChars) {
        omitted += 1;
        continue;
      }
      selected.push({ id: note.id, title: note.title, body: note.body, mentorId: note.mentorId, mentorName: mentor.name });
      totalChars += note.body.length;
    }
    if (omitted > 0) {
      this.dependencies.logger.warn('Vault note corpus was capped or contained notes without a mentor account.', {
        omittedCount: omitted,
        includedChars: totalChars,
        maxCorpusChars: this.maxCorpusChars,
      });
    }
    return selected.sort((left, right) => left.id.localeCompare(right.id));
  }
}
