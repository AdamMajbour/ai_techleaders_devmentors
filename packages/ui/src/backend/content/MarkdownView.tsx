import type { ComponentProps } from 'react';
import Markdown, { type Components } from 'react-markdown';

import { cn } from '../../lib/utils';

export interface MarkdownViewProps {
  /** The markdown text, written by a mentor, a seeker or the AI. It is never trusted. */
  source: string;
  /**
   * `safe` renders http(s) and mailto links as links. `none` renders their text without a link: use it
   * for AI-generated text, where an injected link must not become clickable.
   */
  linkPolicy?: 'safe' | 'none';
  className?: string;
}

const SAFE_LINK = /^(https?:|mailto:)/i;

// Markdown from users is data, not code. No raw HTML (skipHtml), no images, links limited to http(s) and
// mailto with rel="noopener noreferrer nofollow", headings pushed two levels down so the author cannot break the
// page outline. Code stays code: fenced and inline code use the code font on the muted surface (R01.2).
function buildComponents(linkPolicy: 'safe' | 'none'): Components {
  return {
    a: ({ href, children }) => {
      if (linkPolicy === 'none' || !href || !SAFE_LINK.test(href)) return <span>{children}</span>;
      return (
        <a
          href={href}
          rel="noopener noreferrer nofollow"
          className="rounded-sm text-link underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {children}
        </a>
      );
    },
    img: () => null,
    h1: (props: ComponentProps<'h3'>) => <h3 className="m-0 text-section-title font-strong text-headline" {...stripNode(props)} />,
    h2: (props: ComponentProps<'h4'>) => <h4 className="m-0 text-body font-strong text-headline" {...stripNode(props)} />,
    h3: (props: ComponentProps<'h5'>) => <h5 className="m-0 text-body font-strong text-headline" {...stripNode(props)} />,
    h4: (props: ComponentProps<'h6'>) => <h6 className="m-0 text-body font-strong text-headline" {...stripNode(props)} />,
    h5: (props: ComponentProps<'h6'>) => <h6 className="m-0 text-body font-strong text-headline" {...stripNode(props)} />,
    h6: (props: ComponentProps<'h6'>) => <h6 className="m-0 text-body font-strong text-headline" {...stripNode(props)} />,
    p: (props: ComponentProps<'p'>) => <p className="m-0" {...stripNode(props)} />,
    ul: (props: ComponentProps<'ul'>) => <ul className="m-0 flex list-disc flex-col gap-group pl-panel-roomy" {...stripNode(props)} />,
    ol: (props: ComponentProps<'ol'>) => <ol className="m-0 flex list-decimal flex-col gap-group pl-panel-roomy" {...stripNode(props)} />,
    blockquote: (props: ComponentProps<'blockquote'>) => (
      <blockquote className="m-0 border-l border-input pl-between-groups text-muted-foreground" {...stripNode(props)} />
    ),
    pre: (props: ComponentProps<'pre'>) => (
      <pre tabIndex={0} className="m-0 overflow-x-auto rounded-md bg-muted p-panel-compact font-code text-code text-foreground [&_code]:bg-transparent [&_code]:p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" {...stripNode(props)} />
    ),
    code: ({ className, ...props }: ComponentProps<'code'>) => {
      const block = /language-/.test(className ?? '');
      return <code className={cn('font-code text-code', block ? '' : 'rounded-sm bg-muted px-1 text-foreground', className)} {...stripNode(props)} />;
    },
  };
}

// react-markdown passes the syntax-tree `node` to every component; it must not reach the DOM.
function stripNode<T extends object>(props: T): Omit<T, 'node'> {
  const { node: _node, ...rest } = props as T & { node?: unknown };
  void _node;
  return rest;
}

// A URL that is not http(s) or mailto is dropped before it can reach an attribute (react-markdown's own
// default also removes javascript: and similar).
function urlTransform(url: string): string {
  return SAFE_LINK.test(url) ? url : '';
}

export function MarkdownView({ source, linkPolicy = 'safe', className }: MarkdownViewProps) {
  return (
    <div className={cn('flex flex-col gap-between-groups text-body text-foreground', className)}>
      <Markdown skipHtml urlTransform={urlTransform} components={buildComponents(linkPolicy)}>
        {source}
      </Markdown>
    </div>
  );
}
