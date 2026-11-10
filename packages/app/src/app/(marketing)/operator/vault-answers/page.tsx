import { requirePanelAccess } from '../../../../lib/panel-access';
import { OperatorVaultAnswersView } from '../../../api/operator/vault-answers/operator-vault-answers-view';

export const metadata = { title: 'Vault answers' };

export default async function OperatorVaultAnswersPage() {
  await requirePanelAccess('operator');
  return <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact"><h1 className="m-0 text-page-title font-strong text-headline">Vault answers</h1><p className="m-0 max-w-session text-body text-muted-foreground">Lifecycle and refund status only. Questions and generated answers are not shown here.</p><OperatorVaultAnswersView /></main>;
}
