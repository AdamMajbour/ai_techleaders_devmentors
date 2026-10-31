import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)', './docs/**/*.mdx'],
  addons: [
    {
      name: '@storybook/addon-docs',
      // remark-gfm: without it Markdown tables render as raw text with dashes (MDX does not include GFM).
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
    disableWhatsNewNotifications: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
