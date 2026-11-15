import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { AISettings } from '../../../config/env';
import { GeneratorError, type AnswerGenerationInput, type AnswerGenerator, type GenerationCandidate } from '../answer-generator.port';

const outputSchema = z.object({
  answerable: z.boolean(),
  answer: z.string(),
  citations: z.array(z.string()),
}).strict();

const jsonSchema = {
  type: 'object',
  properties: {
    answerable: { type: 'boolean' },
    answer: { type: 'string' },
    citations: { type: 'array', items: { type: 'string' } },
  },
  required: ['answerable', 'answer', 'citations'],
  additionalProperties: false,
};

export class AnthropicAnswerGenerator implements AnswerGenerator {
  private readonly client: Anthropic;

  constructor(private readonly settings: AISettings, client?: Anthropic) {
    if (!settings.ANTHROPIC_API_KEY) throw new GeneratorError('config', 'Anthropic API key is missing.');
    this.client = client ?? new Anthropic({ apiKey: settings.ANTHROPIC_API_KEY, maxRetries: 0 });
  }

  async generate(input: AnswerGenerationInput): Promise<GenerationCandidate> {
    if (!this.settings.AI_LIVE_ENABLED) throw new GeneratorError('config', 'Live AI generation is disabled.');
    let response: Anthropic.Messages.Message;
    try {
      response = await this.client.messages.create({
        model: this.settings.ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: 'Answer only from the supplied mentor notes. If they do not adequately answer the question, set answerable to false. Cite note ids only when their content materially supports the answer. Do not identify the seeker.',
        messages: [{
          role: 'user',
          content: JSON.stringify({ question: input.question, notes: input.notes }),
        }],
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: jsonSchema },
        },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionError) {
        throw new GeneratorError('unavailable', 'The AI provider could not be reached.');
      }
      if (error instanceof Anthropic.APIError) {
        if (error.status === 400 || error.status === 401 || error.status === 403) {
          throw new GeneratorError('config', 'The AI provider rejected its configuration or request.');
        }
        throw new GeneratorError('unavailable', 'The AI provider is temporarily unavailable.');
      }
      throw new GeneratorError('unavailable', 'The AI provider request failed.');
    }

    if (response.stop_reason === 'refusal') throw new GeneratorError('refused', 'The AI provider refused this request.');
    const content = response.content.find((block) => block.type === 'text');
    if (!content || content.type !== 'text') throw new GeneratorError('invalid_output', 'The AI provider returned no structured text.');
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.text);
    } catch {
      throw new GeneratorError('invalid_output', 'The AI provider returned malformed JSON.');
    }
    const output = outputSchema.safeParse(parsed);
    if (!output.success) throw new GeneratorError('invalid_output', 'The AI provider returned an invalid structured response.');
    return {
      answerable: output.data.answerable,
      answer: output.data.answer,
      citationIds: output.data.citations,
      modelId: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
