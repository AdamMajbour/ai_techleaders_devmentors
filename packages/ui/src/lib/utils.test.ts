import { cn } from './utils';

describe('cn', () => {
  it('joins class names and skips falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets later Tailwind utilities override earlier conflicting ones', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('cn with the design-token utilities', () => {
  it('keeps a font-size role and a text colour together', () => {
    expect(cn('text-body', 'text-foreground')).toBe('text-body text-foreground');
    expect(cn('text-label', 'text-muted-foreground')).toBe('text-label text-muted-foreground');
  });

  it('lets a later font-size role replace an earlier one', () => {
    expect(cn('text-body', 'text-meta')).toBe('text-meta');
  });

  it('lets a later control height replace an earlier one', () => {
    expect(cn('h-control', 'h-control-compact')).toBe('h-control-compact');
    expect(cn('h-control', 'h-8')).toBe('h-8');
  });

  it('lets a later relation spacing replace an earlier one', () => {
    expect(cn('gap-group', 'gap-between-groups')).toBe('gap-between-groups');
    expect(cn('px-control-x', 'px-control-x-compact')).toBe('px-control-x-compact');
  });

  it('lets a later minimum control height replace an earlier one', () => {
    expect(cn('min-h-control', 'min-h-control-compact')).toBe('min-h-control-compact');
  });

  it('keeps padding on different axes', () => {
    expect(cn('px-control-x', 'py-group')).toBe('px-control-x py-group');
  });

  it('lets a later layout width replace an earlier one', () => {
    expect(cn('max-w-content', 'max-w-session')).toBe('max-w-session');
  });

  it('lets a later token border colour replace an earlier one', () => {
    expect(cn('border border-input', 'border-composer-border')).toBe('border border-composer-border');
  });
});

