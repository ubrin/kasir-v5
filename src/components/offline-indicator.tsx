
'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as React from 'react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOnline) {
      toast({
        title: "Kembali Online",
        description: "Koneksi internet Anda telah pulih.",
      });
    } else {
       toast({
        title: "Anda Sedang Offline",
        description: "Perubahan akan disimpan & disinkronkan saat kembali online.",
        duration: Infinity, // Keep the toast visible until online again
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);


  if (isOnline) {
    return null;
  }

  // We can return null and rely on the toast, or show a persistent banner.
  // The toast approach is less intrusive. I will stick with toasts.
  return null;
}

export function ConnectionStatus() {
    const isOnline = useOnlineStatus();
    const Icon = isOnline ? Wifi : WifiOff;
    const text = isOnline ? "Online" : "Offline";

    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{text}</span>
        </div>
    )
}
