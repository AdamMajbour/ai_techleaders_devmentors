// Jest setup for DOM tests: adds matchers such as toBeInTheDocument().
// Lives under src/ so the matcher types are part of this package's type-check.
import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

// JSDOM omits Node's encoder; the official server-side AI SDK uses it for request signing.
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;

// jsdom has no ResizeObserver. Radix measures a checkbox that sits inside a <form>, so tests that render one need it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
