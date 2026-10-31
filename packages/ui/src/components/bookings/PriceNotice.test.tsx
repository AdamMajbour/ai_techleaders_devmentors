import { render, screen } from '@testing-library/react';
import { PriceNotice } from './PriceNotice';

describe('PriceNotice', () => {
  it('shows the price, what it buys and the refund rule together (R04)', () => {
    render(
      <PriceNotice
        amountMinor={2500}
        currency="EUR"
        description="for a 25-minute text session with a platform engineer"
        refundRule="You pay now. If the mentor does not show up, you are refunded."
      />,
    );
    const notice = screen.getByRole('region', { name: 'Price' });
    expect(notice).toHaveTextContent('25 EUR for a 25-minute text session with a platform engineer');
    expect(notice).toHaveTextContent('If the mentor does not show up, you are refunded.');
  });

  it('uses tabular figures for the amount', () => {
    render(<PriceNotice amountMinor={1000} currency="EUR" description="for an answer" refundRule="Refunded if rejected." />);
    expect(screen.getByText('10 EUR')).toHaveClass('tabular-nums');
  });

  it('is not an alert: nothing is wrong, it just has to be seen', () => {
    render(<PriceNotice amountMinor={2500} currency="EUR" description="x" refundRule="y" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
