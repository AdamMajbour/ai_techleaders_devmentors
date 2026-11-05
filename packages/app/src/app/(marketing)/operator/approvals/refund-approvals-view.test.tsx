import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as ui from '@devmentor/ui';
import type { ApiResult, ApiError } from '@devmentor/ui';
import type { RefundApprovalDto } from '@devmentor/core';
import { RefundApprovalsView } from './refund-approvals-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;

const retryApproval: RefundApprovalDto = {
  approvalId: 'approval-1',
  paymentId: 'payment-1',
  bookingId: 'booking-1',
  reason: 'mentor_declined',
  status: 'approved',
  createdAt: '2026-11-05T12:00:00.000Z',
  paymentStatus: 'refund_pending',
  amountMinor: 2500,
  currency: 'EUR',
  seekerName: 'Sam Seeker',
  mentorName: 'Ada Mentor',
  allowedActions: ['retry_refund'],
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

function failure<T = never>(message: string): ApiResult<T> {
  const error: ApiError = { code: 'refund_failed', message };
  return { ok: false, status: 503, error };
}

beforeEach(() => {
  apiCall.mockReset();
});

describe('RefundApprovalsView', () => {
  it('shows retryable approved refunds without question text and reloads after retry', async () => {
    apiCall
      .mockResolvedValueOnce(success({ items: [retryApproval] }))
      .mockResolvedValueOnce(success({ id: retryApproval.approvalId, status: 'refunded' }))
      .mockResolvedValueOnce(success({ items: [] }));
    render(<RefundApprovalsView />);

    expect(await screen.findByText('Refund needs retry')).toBeInTheDocument();
    expect(screen.getByText('25.00 EUR', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry refund' })).toBeInTheDocument();
    expect(screen.queryByText(/question/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry refund' }));

    await waitFor(() => expect(apiCall).toHaveBeenNthCalledWith(
      2,
      '/api/operator/approvals/approval-1/approve',
      { method: 'POST', json: {} },
    ));
    expect(await screen.findByText('No refund approvals')).toBeInTheDocument();
  });

  it('surfaces retry failure and keeps the approved request available', async () => {
    apiCall
      .mockResolvedValueOnce(success({ items: [retryApproval] }))
      .mockResolvedValueOnce(failure('The refund could not be completed. The approved request remains available for retry.'))
      .mockResolvedValueOnce(success({ items: [retryApproval] }));
    render(<RefundApprovalsView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Retry refund' }));

    expect(await screen.findByText(/remains available for retry/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Retry refund' })).toBeInTheDocument();
  });

  it('shows loading and recoverable load-error states', async () => {
    let rejectLoad: (error: Error) => void = () => {};
    apiCall.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectLoad = reject;
    }));
    render(<RefundApprovalsView />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    rejectLoad(new Error('Approvals could not be loaded.'));
    expect(await screen.findByText('Approvals could not be loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('supports manual approval and rejection actions', async () => {
    const pending: RefundApprovalDto = {
      ...retryApproval,
      status: 'pending',
      paymentStatus: 'succeeded',
      allowedActions: ['approve', 'reject'],
    };
    apiCall
      .mockResolvedValueOnce(success({ items: [pending] }))
      .mockResolvedValueOnce(success({ id: pending.approvalId, status: 'refunded' }))
      .mockResolvedValueOnce(success({ items: [] }));
    render(<RefundApprovalsView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Approve and refund' }));
    await waitFor(() => expect(apiCall).toHaveBeenNthCalledWith(
      2,
      '/api/operator/approvals/approval-1/approve',
      { method: 'POST', json: {} },
    ));
    expect(await screen.findByText('No refund approvals')).toBeInTheDocument();
  });

  it('confirms rejection before sending the reject action', async () => {
    const pending: RefundApprovalDto = {
      ...retryApproval,
      status: 'pending',
      paymentStatus: 'succeeded',
      allowedActions: ['approve', 'reject'],
    };
    apiCall
      .mockResolvedValueOnce(success({ items: [pending] }))
      .mockResolvedValueOnce(success({ id: pending.approvalId, status: 'rejected' }))
      .mockResolvedValueOnce(success({ items: [] }));
    render(<RefundApprovalsView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject refund' }));

    await waitFor(() => expect(apiCall).toHaveBeenNthCalledWith(
      2,
      '/api/operator/approvals/approval-1/reject',
      { method: 'POST', json: {} },
    ));
    expect(await screen.findByText('No refund approvals')).toBeInTheDocument();
  });
});
