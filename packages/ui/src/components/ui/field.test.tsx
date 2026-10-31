import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';
import { Field } from './field';
import { Input } from './input';
import { Textarea } from './textarea';

describe('Field', () => {
  it('names the control with its label', () => {
    render(
      <Field label="Your question">
        <Textarea />
      </Field>,
    );
    expect(screen.getByLabelText('Your question')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('describes the control with the hint', () => {
    render(
      <Field label="Email" hint="We send the sign-in link here">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('We send the sign-in link here');
  });

  it('marks the control invalid and describes it with the error, announced as an alert', () => {
    render(
      <Field label="Email" hint="Use your work address" error="Enter an address like ada@devmentor.local">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Use your work address Enter an address like ada@devmentor.local');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an address like ada@devmentor.local');
  });

  it('does not mark a field without an error as invalid and shows no alert', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('writes the requirement next to the label', () => {
    render(
      <>
        <Field label="Email" requirement="required">
          <Input />
        </Field>
        <Field label="Company" requirement="optional">
          <Input />
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Email (required)')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Company (optional)')).not.toHaveAttribute('aria-required');
  });

  it('hides the error icon from assistive technology', () => {
    const { container } = render(
      <Field label="Email" error="Required">
        <Input />
      </Field>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('puts a checkbox before its label when inline, and the label toggles it', async () => {
    render(
      <Field label="I accept the pilot terms" orientation="inline">
        <Checkbox />
      </Field>,
    );
    const box = screen.getByRole('checkbox', { name: 'I accept the pilot terms' });
    await userEvent.click(screen.getByText('I accept the pilot terms'));
    expect(box).toBeChecked();
  });

  it('uses a given id for the control', () => {
    render(
      <Field label="Email" id="email-field">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email-field');
  });
});
