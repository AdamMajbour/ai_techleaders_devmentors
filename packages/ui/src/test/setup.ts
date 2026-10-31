// Jest setup for DOM tests: adds matchers such as toBeInTheDocument().
// Lives under src/ so the matcher types are part of this package's type-check.
import '@testing-library/jest-dom';

// jsdom has no ResizeObserver. Radix measures a checkbox that sits inside a <form>, so tests that render one need it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
