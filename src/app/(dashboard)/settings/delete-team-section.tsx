'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { deleteTeam } from '@/actions/teams'

interface DeleteTeamSectionProps {
  teamId: string
  teamName: string
}

export function DeleteTeamSection({ teamId, teamName }: DeleteTeamSectionProps) {
  const router = useRouter()
  const { update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = () => {
    if (confirmText !== teamName) {
      toast.error('팀 이름이 일치하지 않습니다')
      return
    }

    startTransition(async () => {
      const result = await deleteTeam(teamId)
      if (result.success) {
        const nextTeamId = result.data.nextTeamId
        await update({ 
          activeTeamId: nextTeamId,
          teamId: nextTeamId
        })
        toast.success('팀이 삭제되었습니다')
        setOpen(false)
        if (nextTeamId) {
          router.push('/')
        } else {
          router.push('/onboarding')
        }
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4 mr-2" />
          팀 삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>팀 삭제</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              <strong>{teamName}</strong> 팀을 삭제하시겠습니까?
            </span>
            <span className="block text-destructive">
              모든 팀 데이터(거래 내역, 카테고리, 링크 등)가 영구적으로 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="confirmTeamName">
            확인을 위해 팀 이름 <strong>{teamName}</strong>을 입력하세요
          </Label>
          <Input
            id="confirmTeamName"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={teamName}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isPending || confirmText !== teamName}
          >
            {isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
