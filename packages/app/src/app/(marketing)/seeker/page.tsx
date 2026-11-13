import { redirect } from 'next/navigation';

export const metadata = { title: 'My sessions' };

export default function SeekerDashboardPage() {
  redirect('/');
}
