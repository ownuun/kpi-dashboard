import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: '이용약관 | KPI Dashboard',
  description: 'KPI Dashboard 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">이용약관</CardTitle>
          <p className="text-sm text-muted-foreground">
            최종 수정일: {new Date().toLocaleDateString('ko-KR')}
          </p>
        </CardHeader>
        <CardContent className="prose prose-slate max-w-none">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">제1조 (목적)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 약관은 KPI Dashboard(이하 &quot;서비스&quot;)의 이용과 관련하여 
              서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제2조 (서비스의 제공)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스는 팀 단위의 매출 및 지출 관리, 링크 공유 등의 기능을 제공합니다.
              서비스의 구체적인 내용은 서비스 내에서 안내하는 바에 따릅니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제3조 (회원가입)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              회원가입은 Google 계정을 통해 이루어지며, 가입 시 본 약관 및 
              개인정보처리방침에 동의한 것으로 간주합니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제4조 (이용자의 의무)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              이용자는 다음 행위를 하여서는 안 됩니다:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>타인의 정보 도용</li>
              <li>서비스 운영 방해</li>
              <li>불법적인 목적으로의 서비스 이용</li>
              <li>기타 관련 법령에 위배되는 행위</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제5조 (서비스 이용의 제한)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스 제공자는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 
              방해하는 경우 서비스 이용을 제한할 수 있습니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제6조 (책임의 제한)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스 제공자는 천재지변, 시스템 장애 등 불가항력적인 사유로 인한 
              서비스 중단에 대해 책임을 지지 않습니다. 이용자가 입력한 데이터의 
              정확성 및 적법성에 대한 책임은 이용자에게 있습니다.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">제7조 (약관의 변경)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 
              안내합니다.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
