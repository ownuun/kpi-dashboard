import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/70 bg-white/50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              개인정보처리방침
            </Link>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
            <Link
              href="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              이용약관
            </Link>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
            <Link
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              문의
            </Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Slit. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
