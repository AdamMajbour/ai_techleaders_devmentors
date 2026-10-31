import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { TermsConsent } from './TermsConsent';

const meta = {
  title: 'Product/Consents/TermsConsent',
  component: TermsConsent,
  args: { checked: false, termsHref: '#terms', onCheckedChange: () => {} },
} satisfies Meta<typeof TermsConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled(props: React.ComponentProps<typeof TermsConsent>) {
  const [checked, setChecked] = useState(props.checked);
  return (
    <div className="max-w-session">
      <TermsConsent {...props} checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: 'I accept the pilot terms' });
    await expect(box).not.toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard(' ');
    await expect(box).toBeChecked();
  },
};

export const Checked: Story = { args: { checked: true }, render: (args) => <Controlled {...args} /> };

export const WithHint: Story = {
  args: { hint: 'Your question is kept until the pilot ends and then deleted.' },
  render: (args) => <Controlled {...args} />,
};

export const WithError: Story = {
  args: { hint: 'Your question is kept until the pilot ends and then deleted.', error: 'Tick the box to continue.' },
  render: (args) => <Controlled {...args} />,
};
