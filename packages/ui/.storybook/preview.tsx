import type { Decorator, Preview } from '@storybook/react-vite';
import { addons } from 'storybook/preview-api';
import './storybook.css';

type Theme = 'dark' | 'light';

// Theme goes on the document root (not on a wrapper), so dialogs, menus and popovers that render
// outside the story's tree receive it too. Docs pages without stories are covered by the channel
// listeners below, because decorators only run for stories.
function applyTheme(theme: unknown) {
  const next: Theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
}

const initialTheme: Theme = import.meta.env.STORYBOOK_THEME === 'light' ? 'light' : 'dark';
applyTheme(initialTheme);

const channel = addons.getChannel();
channel.on('setGlobals', (payload: { globals?: { theme?: Theme } }) => applyTheme(payload?.globals?.theme));
channel.on('globalsUpdated', (payload: { globals?: { theme?: Theme } }) => applyTheme(payload?.globals?.theme));

const withTheme: Decorator = (Story, context) => {
  applyTheme(context.globals.theme);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: initialTheme },
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        dynamicTitle: true,
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
      },
    },
  },
  parameters: {
    layout: 'padded',
    // Accessibility violations fail the story test (WCAG; see Usage and accessibility).
    a11y: { test: 'error' },
    controls: { expanded: true },
    options: { storySort: { order: ['Design system', ['Start here', 'Components', 'How to choose', 'Usage and accessibility', 'Content', 'What to avoid', 'What is missing', 'Contributing'], 'Foundations', ['Color', 'Typography', 'Spacing and layout', 'Shape and depth', 'Motion', 'Icons', 'Themes'], 'Primitives', 'Product', 'Patterns'] } },
  },
};

export default preview;
