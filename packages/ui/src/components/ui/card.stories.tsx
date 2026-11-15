import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Field } from './field';
import { Textarea } from './textarea';

const meta = {
  title: 'Primitives/Card',
  component: Card,
  argTypes: { density: { control: 'inline-radio', options: ['roomy', 'compact'] } },
  args: { density: 'roomy' },
  render: (args) => (
    <div className="max-w-md">
      <Card {...args}>
        <CardHeader>
          <CardTitle>Your question</CardTitle>
          <CardDescription>A mentor reads it before accepting. The price is 25 PLN.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Question">
            <Textarea />
          </Field>
        </CardContent>
        <CardFooter>
          <Button>Pay 25 PLN</Button>
          <Button variant="ghost">Cancel</Button>
        </CardFooter>
      </Card>
    </div>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Densities: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-between-groups">
      {(['roomy', 'compact'] as const).map((density) => (
        <Card key={density} density={density}>
          <CardHeader>
            <CardTitle>{density === 'roomy' ? 'Roomy: session view, 24 px inside' : 'Compact: dense screens, 12 px inside'}</CardTitle>
            <CardDescription>Same panel, different padding (K1).</CardDescription>
          </CardHeader>
          <CardContent>Body text of the panel.</CardContent>
        </Card>
      ))}
    </div>
  ),
};

export const LongContentNarrow: Story = {
  render: () => (
    <div className="w-80">
      <Card>
        <CardHeader>
          <CardTitle>Notes that feed AI answers and are shown with your name next to the note title</CardTitle>
          <CardDescription>
            Every answer that cites one of your notes is shown to you before the seeker sees it, until the pilot ends on
            14 December.
          </CardDescription>
        </CardHeader>
        <CardContent>kubectl rollout status deployment/ingress-nginx --namespace ingress-nginx --timeout=120s</CardContent>
      </Card>
    </div>
  ),
};

export const StructureAndHeadingLevel: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Questions</CardTitle>
      </CardHeader>
      <CardContent>Nothing yet</CardContent>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 2, name: 'Questions' })).toBeVisible();
  },
};
