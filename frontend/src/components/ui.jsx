export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const badgeTones = {
  active: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  idle: "border-white/10 bg-white/[0.06] text-slate-300",
  locked: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  ready: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
};

export function StatusBadge({ children, className, tone = "idle" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
        badgeTones[tone] ?? badgeTones.idle,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PanelFrame({
  children,
  className,
  description,
  headerAction,
  priority,
  status,
  statusTone = "idle",
  step,
  title,
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 sm:p-7",
        priority ? "ring-1 ring-sky-300/20 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_28px_100px_rgba(15,23,42,0.55)]" : "",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {step}
            </span>
            <StatusBadge tone={statusTone}>{status}</StatusBadge>
            {priority ? (
              <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[11px] font-medium text-sky-100">
                Next recommended action
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[1.7rem]">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
              {description}
            </p>
          </div>
        </div>

        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export function ActionButton({
  children,
  className,
  disabled,
  priority,
  type = "button",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-50",
        priority
          ? "bg-white text-slate-950 shadow-[0_14px_40px_rgba(255,255,255,0.16)] hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(255,255,255,0.22)]"
          : "border border-white/10 bg-white/[0.06] text-slate-100 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09] hover:shadow-[0_14px_35px_rgba(15,23,42,0.38)]",
        className,
      )}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldShell({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 focus-within:border-sky-300/35 focus-within:bg-slate-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SkeletonLine({ className }) {
  return <div className={cn("shimmer rounded-full bg-white/[0.07]", className)} />;
}

export function EmptyState({ children, title }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-slate-300">{children}</div>
    </div>
  );
}

export function InfoBanner({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.04] text-slate-200",
    warning: "border-amber-300/15 bg-amber-300/10 text-amber-50",
    success: "border-emerald-300/15 bg-emerald-300/10 text-emerald-50",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-7",
        tones[tone] ?? tones.neutral,
      )}
    >
      {children}
    </div>
  );
}
