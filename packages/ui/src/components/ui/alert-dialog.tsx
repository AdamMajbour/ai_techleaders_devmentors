'use client';

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps, HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

// The building blocks of ConfirmDialog. An alert dialog has no close button and ignores a click on
// the scrim: the user must choose. Focus starts on Cancel, the least destructive action (WAI-ARIA APG).
function AlertDialog(props: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogContent({ className, children, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/80 p-between-groups"
      >
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            'relative flex w-full max-w-md flex-col gap-between-groups rounded-lg border border-input bg-card p-panel-roomy text-card-foreground focus-visible:outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Overlay>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-group', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-group sm:flex-row sm:justify-end', className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn('m-0 text-section-title font-strong text-headline', className)} {...props} />
  );
}

function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn('m-0 text-body text-muted-foreground', className)} {...props} />
  );
}

function AlertDialogAction({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
