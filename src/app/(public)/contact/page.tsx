'use client'

import { useState, FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const subject = encodeURIComponent(`[KPI Dashboard 문의] ${name}`)
    const body = encodeURIComponent(
      `보낸 사람: ${name}\n이메일: ${email}\n\n문의 내용:\n${message}`
    )
    
    window.location.href = `mailto:slit.amazing@gmail.com?subject=${subject}&body=${body}`
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        뒤로가기
      </Button>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">문의하기</CardTitle>
          <CardDescription>
            궁금한 점이나 건의사항이 있으시면 아래 양식을 작성해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">문의 내용</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="문의하실 내용을 입력해 주세요."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              <Mail className="mr-2 h-4 w-4" />
              이메일 보내기
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              버튼 클릭 시 이메일 클라이언트가 열립니다.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              또는 직접 이메일을 보내주세요:{' '}
              <a 
                href="mailto:slit.amazing@gmail.com" 
                className="font-medium text-primary hover:underline"
              >
                slit.amazing@gmail.com
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
