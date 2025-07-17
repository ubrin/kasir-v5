import Link from "next/link"

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
import Image from "next/image"
import { Logo } from "@/components/ui/logo"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Logo className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl text-center">Daftar ke PT CYBERNETWORK CORP</CardTitle>
          <CardDescription className="text-center">
            Masukkan informasi Anda untuk membuat akun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">Nama depan</Label>
                <Input id="first-name" placeholder="Max" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Nama belakang</Label>
                <Input id="last-name" placeholder="Robinson" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full" asChild>
                <Link href="/delinquency">Buat akun</Link>
            </Button>
          </div>
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
