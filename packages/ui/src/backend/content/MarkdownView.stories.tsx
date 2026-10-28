import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MarkdownView } from './MarkdownView';

const NOTE = `# Upgrading ingress-nginx

Check the **webhook** before the controller:

- confirm the certificate is valid
- run \`kubectl get validatingwebhookconfiguration\`

\`\`\`yaml
controller:
  replicaCount: 3
  admissionWebhooks:
    enabled: true
\`\`\`

See [the upgrade notes](https://kubernetes.github.io/ingress-nginx/) for the full list.`;

const meta = {
  title: 'Primitives/MarkdownView',
  component: MarkdownView,
  args: { source: NOTE },
  argTypes: { linkPolicy: { control: 'inline-radio', options: ['safe', 'none'] } },
  render: (args) => (
    <div className="max-w-(--measure-text)">
      <MarkdownView {...args} />
    </div>
  ),
} satisfies Meta<typeof MarkdownView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 3, name: 'Upgrading ingress-nginx' })).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    await expect(canvas.getByRole('link', { name: 'the upgrade notes' })).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  },
};

export const CodeStaysCode: Story = {
  args: { source: '```yaml\ncontroller:\n  replicaCount: 3\n```' },
  play: async ({ canvasElement }) => {
    const pre = canvasElement.querySelector('pre');
    await expect(pre).toHaveClass('font-code');
    await expect(pre).toHaveTextContent('replicaCount: 3');
  },
};

export const HostileContentIsInert: Story = {
  args: {
    source:
      'A note with <script>alert(1)</script> and <b onclick="steal()">raw html</b>.\n\n[click me](javascript:alert(1))\n\n![tracker](https://tracker.example/pixel.png)\n\nText after.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('script')).toBeNull();
    await expect(canvasElement.querySelector('img')).toBeNull();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    await expect(canvas.getByText(/Text after/)).toBeVisible();
  },
};

export const AiAnswerWithoutLinks: Story = {
  args: { linkPolicy: 'none', source: 'Answer drawn from the notes. See [the docs](https://example.com/docs).' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('link')).not.toBeInTheDocument();
    await expect(canvasElement).toHaveTextContent('Answer drawn from the notes. See the docs.');
  },
};

export const LongCodeLineNarrow: Story = {
  args: { source: '```\nkubectl rollout status deployment/ingress-nginx --namespace ingress-nginx --timeout=120s --watch=true\n```' },
  render: (args) => (
    <div className="w-80">
      <MarkdownView {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('pre')).toHaveClass('overflow-x-auto');
  },
};
