import type { ReactNode } from 'react';

export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-20"
      >
        <span className="block whitespace-nowrap bg-white border-2 border-ink shadow-retro px-2 py-1 text-[10px] font-black uppercase tracking-wider text-ink">
          {label}
        </span>
      </span>
    </span>
  );
}
