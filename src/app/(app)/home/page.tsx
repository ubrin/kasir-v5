'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileClock, FilePieChart, Users, Wallet, Loader2 } from "lucide-react";
import * as React from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import withAuth from '@/components/withAuth';

function HomePage() {
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setAppUser(docSnap.data() as AppUser);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Selamat Datang!</h1>
            <p className="text-muted-foreground">
            Pilih menu di bawah untuk mulai mengelola bisnis Anda.
            </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/delinquency">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <FileClock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Tagihan</CardTitle>
                <CardDescription>Lihat dan kelola semua tagihan pelanggan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/payment-report">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <FilePieChart className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Laporan</CardTitle>
                <CardDescription>Tinjau laporan pembayaran dan pemasukan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/customers">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Data Pelanggan</CardTitle>
                <CardDescription>Akses dan kelola informasi semua pelanggan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        {appUser?.role === 'admin' && (
          <Link href="/finance">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-md">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Keuangan</CardTitle>
                  <CardDescription>Lihat ringkasan dan statistik keuangan.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}

export default withAuth(HomePage);
