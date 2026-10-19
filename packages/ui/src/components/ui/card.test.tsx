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
    expect(screen.getByTestId('card')).toHaveClass('rounded-xl', 'mt-4');
  });
});
