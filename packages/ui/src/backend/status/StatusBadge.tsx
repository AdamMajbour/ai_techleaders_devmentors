import { StatusBadge as ToneBadge, type StatusBadgeProps as ToneBadgeProps } from '../../components/ui/status-badge';

export type StatusTone = NonNullable<ToneBadgeProps['tone']>;

export type StatusLabel = {
  text: string;
  tone: StatusTone;
};

export interface StatusBadgeProps {
  status: string;
  labels: Record<string, StatusLabel>;
}

export function StatusBadge({ status, labels }: StatusBadgeProps) {
  const label = labels[status];
  const text = label?.text.trim() ? label.text : status.trim() || 'Unknown status';

  return (
    <ToneBadge data-status={status} tone={label?.tone ?? 'neutral'}>
      {text}
    </ToneBadge>
  );
}
