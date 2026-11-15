import { render, screen } from '@testing-library/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

describe('Card', () => {
  it('renders all parts with their content', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('bg-card');
  });

  it('merges a custom className without losing the base styles', () => {
    render(
      <Card data-testid="card" className="mt-4">
        x
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('rounded-lg', 'mt-4');
  });

  it('has no shadow: it is separated by an outline (R01.1)', () => {
    render(<Card data-testid="card">x</Card>);
    expect(screen.getByTestId('card').className).not.toMatch(/shadow/);
    expect(screen.getByTestId('card')).toHaveClass('border');
  });

  it('is roomy by default and compact on request', () => {
    render(
      <>
        <Card data-testid="roomy">x</Card>
        <Card data-testid="compact" density="compact">
          x
        </Card>
      </>,
    );
    expect(screen.getByTestId('roomy')).toHaveAttribute('data-density', 'roomy');
    expect(screen.getByTestId('compact')).toHaveAttribute('data-density', 'compact');
  });

  it('lets the title use the heading level that fits the page', () => {
    render(<CardTitle as="h2">Questions</CardTitle>);
    expect(screen.getByRole('heading', { level: 2, name: 'Questions' })).toBeInTheDocument();
  });
});
