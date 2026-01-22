'use client'

import { useState } from 'react'
import { Copy, RefreshCw, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { regenerateInviteCode } from '@/actions/teams'

interface InviteCodeSectionProps {
  inviteCode: string
}

export function InviteCodeSection({ inviteCode: initialCode }: InviteCodeSectionProps) {
  const [inviteCode, setInviteCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('초대 링크가 복사되었습니다')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const result = await regenerateInviteCode()
      if (result.success) {
        setInviteCode(result.data)
        toast.success('새 초대 코드가 생성되었습니다')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={inviteUrl}
          className="font-mono text-xs sm:text-sm min-w-0"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">초대 코드</p>
          <p className="font-mono text-lg font-bold tracking-wider">{inviteCode}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          재생성
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        초대 코드를 재생성하면 기존 코드는 더 이상 사용할 수 없습니다
      </p>
    </div>
  )
}
