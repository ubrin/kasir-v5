
'use client';
import Link from "next/link"
import Image from "next/image"
import * as React from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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


export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                role: "user", // Default role
            });

            toast({
                title: "Pendaftaran Berhasil",
                description: "Akun Anda telah dibuat. Anda akan diarahkan ke halaman utama.",
            });
            router.push("/home");
        } catch (err: any) {
            console.error("Signup failed:", err); // Log the full error for debugging
            let errorMessage = "Terjadi kesalahan saat pendaftaran. Silakan coba lagi.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Email ini sudah terdaftar.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Format email tidak valid.';
                        break;
                    case 'auth/configuration-not-found':
                        errorMessage = 'Konfigurasi Autentikasi tidak ditemukan. Pastikan metode login Email/Password sudah diaktifkan di Firebase Console.';
                        break;
                    case 'permission-denied':
                        errorMessage = 'Gagal menyimpan data pengguna. Periksa aturan keamanan Firestore Anda.';
                        break;
                    default:
                        errorMessage = `Terjadi kesalahan: ${err.message}`;
                        break;
                }
            }
            setError(errorMessage);
             toast({
                title: "Pendaftaran Gagal",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Buat Akun Baru</CardTitle>
          <CardDescription className="text-center">
            Masukkan informasi Anda untuk membuat akun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">Nama depan</Label>
                <Input 
                    id="first-name" 
                    placeholder="Max" 
                    required 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Nama belakang</Label>
                <Input 
                    id="last-name" 
                    placeholder="Robinson" 
                    required 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                />
              </div>
            </div>
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
              <Label htmlFor="password">Kata Sandi</Label>
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
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Buat akun'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Sudah punya akun?{" "}
            <Link href="/" className="underline">
              Masuk
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
