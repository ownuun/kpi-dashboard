export default function TransactionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded mt-1" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded" />
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-slate-100 rounded" />
        ))}
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
