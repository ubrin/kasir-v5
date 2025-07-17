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
import { Bot } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground rounded-full p-3">
              <Bot className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Daftar ke InvoiceFlow</CardTitle>
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
                <Link href="/dashboard">Buat akun</Link>
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
