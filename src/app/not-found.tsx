import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { FileQuestion } from 'lucide-react'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FileQuestion className="h-6 w-6 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              페이지를 찾을 수 없습니다
            </h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-600">
              요청하신 페이지가 존재하지 않거나 이동되었습니다.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/login">로그인으로 돌아가기</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
