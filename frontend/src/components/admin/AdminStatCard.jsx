export default function AdminStatCard({ label, value, description, trend, icon: Icon, tone = 'primary' }) {
  const gradients = {
    primary: 'from-violet-500 to-indigo-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    slate: 'from-slate-500 to-slate-700',
  }

  const gradient = gradients[tone] || gradients.primary

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        {Icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white bg-gradient-to-br ${gradient}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-[2rem] font-black tracking-tight text-slate-900 leading-none">{value}</p>
      {trend && (
        <p className={`mt-2 text-xs font-bold ${trend.positive ? 'text-emerald-600' : trend.neutral ? 'text-slate-400' : 'text-rose-500'}`}>
          {trend.prefix} {trend.value} vs last 7d
        </p>
      )}
      {description && <p className="mt-2 text-xs text-slate-400 leading-5">{description}</p>}
    </div>
  )
}
