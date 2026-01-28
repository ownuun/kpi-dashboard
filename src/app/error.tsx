'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            문제가 발생했습니다
          </h2>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-slate-600">
            페이지를 불러오는 중 오류가 발생했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-slate-400">
              오류 코드: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
