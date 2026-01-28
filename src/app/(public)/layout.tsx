import { Footer } from '@/components/layout/footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
