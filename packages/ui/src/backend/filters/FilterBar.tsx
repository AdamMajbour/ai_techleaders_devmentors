'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Select } from '../../components/ui/select';

export interface FilterBarOption {
  value: string;
  /** The words of the reader: "Accepted", not "accepted". */
  label: string;
}

export interface FilterBarProps {
  /** The name of the filter: "Status". It is the label of the select and the start of the chip. */
  label: string;
  /** The options after the "all" option, in the order of the screen. */
  options: FilterBarOption[];
  /** The first option, which means no filter: "All statuses". */
  allLabel: string;
  /** The chosen option, or '' for no filter. */
  value: string;
  onChange: (value: string) => void;
  /** Rows after filtering. */
  count: number;
  /** What the list holds, in the singular and the plural: "session", "sessions". */
  noun: { one: string; many: string };
  /** The part of the count after the number while a filter is on: `for ${label}`, `with status "${label}"`. */
  phrase: (label: string) => string;
}

// The filter bar of a list: the select, the active filter with a chip that says it can be removed, "Clear all filters",
// and the result count. Render it only when the list has items (List with filters, §5). Removing a filter in any way
// moves focus to the select, so the keyboard user does not lose their place.
export function FilterBar({ label, options, allLabel, value, onChange, count, noun, phrase }: FilterBarProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const previous = useRef(value);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (previous.current && !value) selectRef.current?.focus();
    previous.current = value;
  }, [value]);

  return (
    <div className="flex flex-col gap-between-groups">
      <div className="max-w-session">
        <Field label={label}>
          <Select ref={selectRef} density="compact" value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{allLabel}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {selected ? (
        <div className="flex flex-wrap items-center gap-group">
          <Button variant="outline" size="sm" onClick={() => onChange('')}>
            {label}: {selected.label}
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">, remove filter</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>
            Clear all filters
          </Button>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="m-0 text-label text-muted-foreground">
        {`${count} ${count === 1 ? noun.one : noun.many}`}
        {selected ? ` ${phrase(selected.label)}` : ''}
      </p>
    </div>
  );
}
