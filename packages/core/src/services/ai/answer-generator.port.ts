export interface AnswerSourceNote {
  readonly id: string;
  readonly title: string;
  readonly mentorName: string;
  readonly body: string;
}

export interface AnswerGenerationInput {
  readonly question: string;
  readonly notes: readonly AnswerSourceNote[];
}

export interface GenerationCandidate {
  readonly answerable: boolean;
  readonly answer: string;
  readonly citationIds: readonly string[];
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface AnswerGenerator {
  generate(input: AnswerGenerationInput): Promise<GenerationCandidate>;
}

export type GeneratorErrorKind = 'unanswerable' | 'refused' | 'invalid_output' | 'unavailable' | 'config';

export class GeneratorError extends Error {
  constructor(readonly kind: GeneratorErrorKind, message = 'Answer generation failed.') {
    super(message);
    this.name = 'GeneratorError';
  }
}
