
'use client';
import Link from "next/link"
import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [authLoading, setAuthLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push("/home");
            } else {
                setAuthLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast({
                title: "Login Berhasil",
                description: "Anda akan diarahkan ke halaman utama.",
            });
            router.push("/home");
        } catch (err: any) {
             const errorMessage = err.code === 'auth/invalid-credential' 
                ? 'Email atau kata sandi salah.'
                : 'Terjadi kesalahan. Silakan coba lagi.';
            setError(errorMessage);
            toast({
                title: "Login Gagal",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };
    
    if (authLoading) {
        return (
             <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        )
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center pt-6">Tagihan Adit</CardTitle>
          <CardDescription className="text-center">
            Selamat datang! Masuk untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Kata Sandi</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Masuk'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Belum punya akun?{" "}
            <Link href="/signup" className="underline">
              Daftar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
