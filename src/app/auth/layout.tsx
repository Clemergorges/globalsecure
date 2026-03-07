
import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <Logo className="h-10 w-10" />
          <span className="text-2xl font-bold text-blue-900">GlobalSecure</span>
        </Link>
        <div className="w-full max-w-[400px]">
          {children}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} GlobalSecure. Todos os direitos reservados.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="#" className="hover:text-gray-900">Termos</Link>
            <Link href="#" className="hover:text-gray-900">Privacidade</Link>
            <Link href="#" className="hover:text-gray-900">Ajuda</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
