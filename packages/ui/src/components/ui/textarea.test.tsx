import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('lets the user type several lines', async () => {
    render(<Textarea aria-label="Question" />);
    const box = screen.getByRole('textbox', { name: 'Question' });
    await userEvent.type(box, 'kubectl get pods{enter}kubectl logs');
    expect(box).toHaveValue('kubectl get pods\nkubectl logs');
  });

  it('marks an invalid field and a disabled one', () => {
    render(
      <>
        <Textarea aria-label="Bad" aria-invalid="true" />
        <Textarea aria-label="Off" disabled />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Bad' })).toBeInvalid();
    expect(screen.getByRole('textbox', { name: 'Off' })).toBeDisabled();
  });
});
