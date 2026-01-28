import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: '개인정보처리방침 | KPI Dashboard',
  description: 'KPI Dashboard 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">개인정보처리방침</CardTitle>
          <p className="text-sm text-muted-foreground">
            최종 수정일: {new Date().toLocaleDateString('ko-KR')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-slate max-w-none">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">1. 수집하는 개인정보</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KPI Dashboard는 서비스 제공을 위해 Google OAuth를 통해 다음 정보를 수집합니다:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>이메일 주소</li>
              <li>이름</li>
              <li>프로필 사진 URL</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">2. 개인정보의 이용 목적</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              수집된 개인정보는 다음 목적으로만 사용됩니다:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>서비스 회원 식별 및 인증</li>
              <li>팀 구성원 관리</li>
              <li>서비스 이용 기록 관리</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">3. 개인정보의 보관 및 파기</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              회원 탈퇴 시 개인정보는 즉시 파기됩니다. 단, 관련 법령에 따라 보관이 필요한 경우 
              해당 기간 동안 보관 후 파기합니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KPI Dashboard는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">5. 문의</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              개인정보 관련 문의사항은 문의 페이지를 통해 연락해 주시기 바랍니다.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
