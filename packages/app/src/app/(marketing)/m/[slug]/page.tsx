import { MentorProfileView } from './mentor-profile-view';

type MentorPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string | string[] }>;
};

export default async function MentorPage({ params, searchParams }: MentorPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const source = query.source === 'list' ? 'list' : 'link';
  return <MentorProfileView slug={slug} source={source} />;
}
