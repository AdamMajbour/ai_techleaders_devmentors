import { formatClock } from '../../lib/format';
import { parseMessageText } from './parseMessageText';

export interface MessageItemProps {
  authorName: string;
  /** ISO time the server stored the message at. */
  sentAt: string;
  text: string;
  /** The viewer wrote it. Marked with the words "(you)", not only by position or colour. */
  own?: boolean;
  timeZone?: string;
}

// One message in the session. Who wrote it and when are always visible (R02.3). Plain text, and code in
// triple-backtick fences stays code in the code font (R01.2); nothing else is formatted. Render inside an <ol>.
export function MessageItem({ authorName, sentAt, text, own = false, timeZone }: MessageItemProps) {
  return (
    <li className="flex flex-col gap-group border-b border-border py-panel-compact last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-group">
        <span className="text-label font-strong text-headline">
          {authorName}
          {own ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
        </span>
        <time dateTime={sentAt} className="text-meta tabular-nums text-message-meta-foreground">
          {formatClock(sentAt, timeZone)}
        </time>
      </div>
      {parseMessageText(text).map((segment, index) =>
        segment.type === 'code' ? (
          <pre key={index} tabIndex={0} className="m-0 overflow-x-auto rounded-md bg-muted p-panel-compact font-code text-code text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {segment.value}
          </pre>
        ) : (
          <p key={index} className="m-0 whitespace-pre-wrap break-words text-body text-foreground">
            {segment.value}
          </p>
        ),
      )}
    </li>
  );
}
