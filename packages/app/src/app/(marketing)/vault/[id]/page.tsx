import { VaultAnswerPolling } from './vault-answer-polling';

export default async function VaultAnswerRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VaultAnswerPolling id={id} />;
}