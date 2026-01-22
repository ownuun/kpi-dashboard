export default function NewTransactionLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-slate-200 rounded" />

      <div className="rounded-lg border bg-white p-6 space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-50 rounded" />
          </div>
        ))}
        <div className="h-10 w-full bg-slate-200 rounded" />
      </div>
    </div>
  )
}
