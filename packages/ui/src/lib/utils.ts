import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's built-in names. The design tokens add utilities such as
// text-body (a font size), h-control (a height) and gap-group (a spacing). Without this list it
// would treat text-body like a colour and silently drop one of text-body / text-foreground.
// Keep in sync with the @theme block in styles/index.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        'group',
        'between-groups',
        'panel-compact',
        'panel-roomy',
        'section',
        'control',
        'control-compact',
        'control-x',
        'control-x-compact',
      ],
      text: ['page-title', 'section-title', 'body', 'label', 'meta', 'code'],
      'font-weight': ['strong'],
      container: ['content', 'session'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
