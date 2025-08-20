
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InfoDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function InfoDialog({ trigger, title, description, children }: InfoDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          {children}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
