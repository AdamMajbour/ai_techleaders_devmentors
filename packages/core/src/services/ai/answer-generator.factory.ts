import { assertAIReadyToCharge, getAISettings } from '../../config/env';
import type { AnswerGenerator } from './answer-generator.port';
import { AnthropicAnswerGenerator } from './adapters/anthropic-answer-generator';
import { MockAnswerGenerator } from './adapters/mock-answer-generator';

export function createConfiguredAnswerGenerator(): AnswerGenerator {
  const settings = getAISettings();
  return settings.AI_MODE === 'anthropic'
    ? new AnthropicAnswerGenerator(settings)
    : new MockAnswerGenerator();
}

export function assertConfiguredAIReadyToCharge(): void {
  assertAIReadyToCharge(getAISettings());
}
