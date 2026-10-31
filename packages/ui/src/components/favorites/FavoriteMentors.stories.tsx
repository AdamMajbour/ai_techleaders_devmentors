import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FavoriteMentors, type FavoriteMentor, type FavoriteMentorsProps } from './FavoriteMentors';

const MENTORS: FavoriteMentor[] = [
  {
    id: 'riley-chen',
    name: 'Riley Chen',
    headline: 'Improved deployment reliability for teams running Kubernetes services.',
    technologies: ['Go', 'Kubernetes'],
    href: '#riley-chen',
  },
  {
    id: 'morgan-patel',
    name: 'Morgan Patel',
    headline: 'Migrated a PostgreSQL service without downtime.',
    technologies: ['PostgreSQL', 'Python'],
    href: '#morgan-patel',
  },
  {
    id: 'alex-rivera',
    name: 'Alex Rivera',
    headline: 'Built a shared component library for a React application.',
    technologies: ['React', 'TypeScript'],
    href: '#alex-rivera',
  },
];

const TECHNOLOGIES = ['Go', 'Kubernetes', 'PostgreSQL', 'Python', 'React', 'TypeScript'];

function LocalFavorites(args: FavoriteMentorsProps) {
  const [mentors, setMentors] = useState(args.mentors);

  return (
    <FavoriteMentors
      {...args}
      mentors={mentors}
      onRemove={(mentorId) => {
        args.onRemove(mentorId);
        setMentors((current) => current.filter((mentor) => mentor.id !== mentorId));
      }}
    />
  );
}

const meta = {
  title: 'Product/Favorites/FavoriteMentors',
  component: FavoriteMentors,
  args: {
    mentors: MENTORS,
    technologies: TECHNOLOGIES,
    findMentorsHref: '#mentors',
    onRemove: fn(),
  },
} satisfies Meta<typeof FavoriteMentors>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFavorites: Story = {
  render: (args) => <LocalFavorites {...args} />,
};

export const NoResultsForFilter: Story = {
  args: { initialTechnology: 'TypeScript' },
};

export const NothingHereYet: Story = {
  args: { mentors: [] },
};

export const Loading: Story = {
  args: { isLoading: true },
};

export const LoadFailed: Story = {
  args: {
    error: 'Favorite mentors could not be loaded. Check your connection and try again.',
    onRetry: fn(),
  },
};

export const LongTextNarrow: Story = {
  args: {
    mentors: [
      {
        ...MENTORS[0],
        headline:
          'Improved deployment reliability for teams running Kubernetes services across multiple production environments.',
        technologies: ['Kubernetes', 'Go', 'Linux networking', 'Prometheus', 'Terraform'],
      },
    ],
  },
  render: (args) => (
    <div className="max-w-session">
      <FavoriteMentors {...args} />
    </div>
  ),
};
