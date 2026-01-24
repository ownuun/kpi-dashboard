'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { removeMember } from '@/actions/teams'

interface RemoveMemberButtonProps {
  memberId: string
  memberName: string | null
}

export function RemoveMemberButton({ memberId, memberName }: RemoveMemberButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRemove = async () => {
    if (!confirm(`정말 ${memberName || '이 멤버'}를 팀에서 제거하시겠습니까?`)) {
      return
    }

    setIsLoading(true)
    try {
      const result = await removeMember(memberId)
      if (result.success) {
        toast.success('멤버가 제거되었습니다')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('멤버 제거에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRemove}
      disabled={isLoading}
      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
