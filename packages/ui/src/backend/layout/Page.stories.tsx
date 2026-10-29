import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Page } from './Page';

const meta = {
  title: 'Primitives/Page',
  component: Page,
  args: {
    title: 'My sessions',
    children: <p className="m-0 text-body text-foreground">The content of the page goes here.</p>,
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ContentWidth: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'My sessions' })).toBeVisible();
    await expect(canvasElement.querySelector('main')).toHaveClass('max-w-content');
  },
};

export const NarrowSessionWidth: Story = {
  args: { narrow: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('main')).toHaveClass('max-w-session');
  },
};
