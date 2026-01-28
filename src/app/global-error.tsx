'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ko">
      <body className="bg-slate-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="mb-2 text-xl font-semibold text-slate-900">
                심각한 오류가 발생했습니다
              </h1>
              <p className="mb-6 text-sm text-slate-600">
                애플리케이션에 예기치 않은 문제가 발생했습니다.
                <br />
                페이지를 새로고침해 주세요.
              </p>
              {error.digest && (
                <p className="mb-4 text-xs text-slate-400">
                  오류 코드: {error.digest}
                </p>
              )}
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                새로고침
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
