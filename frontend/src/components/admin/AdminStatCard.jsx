export default function AdminStatCard({ label, value, description, trend, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700 border-primary-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {trend ? (
            <p className={`mt-2 text-sm font-semibold ${trend.positive ? 'text-emerald-600' : trend.neutral ? 'text-slate-500' : 'text-rose-600'}`}>
              {trend.prefix} {trend.value}
            </p>
          ) : null}
          {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[tone] || tones.primary}`}>
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
      </div>
    </div>
  )
}
