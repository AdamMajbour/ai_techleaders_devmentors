import Anthropic from '@anthropic-ai/sdk';
import type { AISettings } from '../../../config/env';
import { GeneratorError } from '../answer-generator.port';
import { AnthropicAnswerGenerator } from './anthropic-answer-generator';

const settings: AISettings = {
  AI_MODE: 'anthropic',
  AI_ALLOW_MOCK_IN_PRODUCTION: false,
  AI_LIVE_ENABLED: true,
  ANTHROPIC_API_KEY: 'test-key',
  ANTHROPIC_MODEL: 'claude-opus-5-5',
  PAYMENTS_LIVE_ENABLED: false,
  NODE_ENV: 'test',
};

describe('AnthropicAnswerGenerator', () => {
  it('uses structured JSON output and maps the response into the shared port', async () => {
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      model: 'claude-opus-5-5',
      content: [{ type: 'text', text: JSON.stringify({ answerable: true, answer: 'Use a loop.', citations: ['note-1'] }) }],
      usage: { input_tokens: 21, output_tokens: 8 },
    });
    const client = { messages: { create } } as unknown as Anthropic;
    const generator = new AnthropicAnswerGenerator(settings, client);
    await expect(generator.generate({
      question: 'How do I loop?',
      notes: [{ id: 'note-1', title: 'Loops', mentorName: 'Mentor', body: 'Use for loops.' }],
    })).resolves.toEqual({
      answerable: true,
      answer: 'Use a loop.',
      citationIds: ['note-1'],
      modelId: 'claude-opus-5-5',
      inputTokens: 21,
      outputTokens: 8,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      max_tokens: 4000,
      output_config: expect.objectContaining({ effort: 'medium', format: expect.objectContaining({ type: 'json_schema' }) }),
    }));
  });

  it('fails closed when live generation is disabled', async () => {
    const create = jest.fn();
    const generator = new AnthropicAnswerGenerator({ ...settings, AI_LIVE_ENABLED: false }, { messages: { create } } as unknown as Anthropic);
    await expect(generator.generate({ question: 'Q', notes: [] })).rejects.toMatchObject({ kind: 'config' });
    expect(create).not.toHaveBeenCalled();
  });

  it('maps transport and provider configuration failures without exposing provider details', async () => {
    const connectionClient = {
      messages: { create: jest.fn().mockRejectedValue(new Anthropic.APIConnectionError({ message: 'network details' })) },
    } as unknown as Anthropic;
    const connectionGenerator = new AnthropicAnswerGenerator(settings, connectionClient);
    await expect(connectionGenerator.generate({ question: 'Q', notes: [] })).rejects.toMatchObject({ kind: 'unavailable' });

    const authClient = {
      messages: { create: jest.fn().mockRejectedValue(new Anthropic.AuthenticationError(401, {
        type: 'error', error: { type: 'authentication_error', message: 'secret details' }, request_id: 'req-id',
      }, 'auth details', new Headers())) },
    } as unknown as Anthropic;
    const authGenerator = new AnthropicAnswerGenerator(settings, authClient);
    await expect(authGenerator.generate({ question: 'Q', notes: [] })).rejects.toThrow(GeneratorError);
    await expect(authGenerator.generate({ question: 'Q', notes: [] })).rejects.toMatchObject({ kind: 'config' });
  });
});
