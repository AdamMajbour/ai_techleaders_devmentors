import type { ReactNode } from 'react';

export type PreviewState = { name: string; props: Record<string, unknown> };

// Hover and focus cannot be shown on a static page, so the preview attaches the same declarations as
// :hover and :focus-visible to a data attribute (see storybook.css). The attribute exists only here.
export const PREVIEW_STATES = {
  default: { name: 'Default', props: {} },
  hover: { name: 'Hover', props: { 'data-preview-state': 'hover' } },
  focus: { name: 'Focus', props: { 'data-preview-state': 'focus' } },
  pressed: { name: 'Pressed', props: { 'data-preview-state': 'pressed' } },
  disabled: { name: 'Disabled', props: { disabled: true } },
  invalid: { name: 'Invalid', props: { 'aria-invalid': true } },
} satisfies Record<string, PreviewState>;

// Documentation helper: renders the real component once per state.
export function StateMatrix({
  states,
  children,
}: {
  states: PreviewState[];
  children: (props: Record<string, unknown>, state: PreviewState) => ReactNode;
}) {
  return (
    <ul className="m-0 flex list-none flex-wrap items-start gap-between-groups p-0">
      {states.map((state) => (
        <li key={state.name} className="flex flex-col items-start gap-group">
          <span className="text-meta text-muted-foreground">{state.name}</span>
          {children(state.props, state)}
        </li>
      ))}
    </ul>
  );
}
