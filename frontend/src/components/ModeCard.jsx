import { cn } from "./ui";

const toneClasses = {
  brutal: {
    active:
      "border-rose-400/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.9),rgba(28,11,18,0.96))] shadow-[0_24px_80px_rgba(244,63,94,0.22)]",
    badge: "border-rose-300/25 bg-rose-300/12 text-rose-100",
    idle:
      "border-rose-400/12 bg-[linear-gradient(180deg,rgba(50,17,25,0.9),rgba(15,23,42,0.96))] hover:border-rose-300/25 hover:shadow-[0_24px_70px_rgba(190,24,93,0.18)]",
    orb: "from-rose-500/45 via-orange-400/15 to-transparent",
    ring: "ring-1 ring-rose-300/35",
  },
  normal: {
    active:
      "border-sky-300/35 bg-[linear-gradient(180deg,rgba(8,47,73,0.88),rgba(12,30,58,0.94))] shadow-[0_24px_80px_rgba(56,189,248,0.18)]",
    badge: "border-emerald-300/22 bg-emerald-300/12 text-emerald-50",
    idle:
      "border-sky-300/12 bg-[linear-gradient(180deg,rgba(8,32,55,0.86),rgba(15,23,42,0.96))] hover:border-sky-300/25 hover:shadow-[0_24px_70px_rgba(56,189,248,0.16)]",
    orb: "from-sky-400/35 via-emerald-300/10 to-transparent",
    ring: "ring-1 ring-sky-300/30",
  },
};

export default function ModeCard({
  badge,
  description,
  icon,
  isActive,
  onClick,
  title,
  tone = "normal",
}) {
  const palette = toneClasses[tone] ?? toneClasses.normal;

  return (
    <button
      className={cn(
        "group relative overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300",
        "hover:-translate-y-1 hover:scale-[1.01]",
        isActive ? `${palette.active} ${palette.ring} mode-card-active` : palette.idle,
      )}
      type="button"
      onClick={onClick}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-radial",
          `bg-gradient-to-br ${palette.orb}`,
        )}
      />

      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span aria-hidden="true">{icon}</span>
            </div>

            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                palette.badge,
              )}
            >
              {isActive ? "Selected" : badge}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h3>
            <p className="max-w-md text-sm leading-7 text-slate-200/90">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm text-slate-200/80">
          <span>{isActive ? "Ready to use" : "Tap to select"}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            {isActive ? "Active" : "Choose"}
          </span>
        </div>
      </div>
    </button>
  );
}
