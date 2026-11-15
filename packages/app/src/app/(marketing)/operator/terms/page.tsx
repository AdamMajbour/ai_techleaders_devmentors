import { requirePanelAccess } from '../../../../lib/panel-access';
import { OperatorTermsView } from './terms-view';

export const metadata = { title: 'Pilot terms' };

export default async function OperatorTermsPage() {
  await requirePanelAccess('operator');
  return <OperatorTermsView />;
}
