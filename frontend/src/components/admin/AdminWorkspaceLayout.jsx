import { Link } from 'react-router-dom'

export default function AdminWorkspaceLayout({
  title,
  description,
  icon: Icon,
  sections,
  activeSection,
  action,
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {Icon && (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
              {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 sticky top-[88px] shadow-sm">
              <nav className="space-y-0.5">
                {sections.map((section) => {
                  const SectionIcon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <Link
                      key={section.id}
                      to={section.to}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <SectionIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-sm font-semibold">{section.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <section className="flex-1 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                <h2 className="text-base font-bold text-slate-900">
                  {sections.find((s) => s.id === activeSection)?.label || title}
                </h2>
                {sections.find((s) => s.id === activeSection)?.description && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {sections.find((s) => s.id === activeSection)?.description}
                  </p>
                )}
              </div>
              <div className="p-6 lg:p-8">{children}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
