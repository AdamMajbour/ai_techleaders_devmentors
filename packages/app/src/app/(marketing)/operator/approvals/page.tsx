import { RefundApprovalsView } from './refund-approvals-view';
import { requirePanelAccess } from '../../../../lib/panel-access';

export const metadata = { title: 'Refund approvals' };

export default async function RefundApprovalsPage() {
  await requirePanelAccess('operator');
  return <RefundApprovalsView />;
}
