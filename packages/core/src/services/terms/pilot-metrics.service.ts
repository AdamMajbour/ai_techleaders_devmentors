import type { PilotMetricsRepository } from '@devmentor/db';
import { ValidationError } from '../../http/errors';

export class PilotMetricsService {
  constructor(private readonly repository: Pick<PilotMetricsRepository, 'read'>) {}

  async read(input: { from: string; to: string }) {
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
      throw new ValidationError('Choose a valid start and end time.');
    }
    if (to.getTime() - from.getTime() > 92 * 24 * 60 * 60 * 1000) {
      throw new ValidationError('A reporting window cannot exceed 92 days.');
    }
    const rows = await this.repository.read({ from, to });
    return { from: from.toISOString(), to: to.toISOString(), generatedAt: new Date().toISOString(), rows };
  }
}
