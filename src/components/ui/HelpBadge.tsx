import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpBadgeProps {
  /** Penjelasan singkat (tooltip). */
  text: string;
  /** Panduan beberapa langkah (popover). Opsional. */
  steps?: string[];
  /** Posisi popover. Default 'left'. */
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/**
 * Bantuan kontekstual: ikon "?" yang menampilkan tooltip singkat (hover/fokus)
 * dan popover panduan (klik/ketuk). Bisa ditutup klik di luar atau Escape.
 * Ukuran minimal nyaman untuk sentuh.
 */
export default function HelpBadge({ text, steps, align = 'left', className = '' }: HelpBadgeProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const alignClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label="Bantuan"
        aria-expanded={open}
        title="Bantuan"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="h-5 w-5 rounded-full text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 flex items-center justify-center cursor-pointer transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {/* Tooltip singkat (hover, tanpa langkah) */}
      {hover && !open && !steps && (
        <div className={`absolute z-40 top-full mt-1 ${alignClass} w-56 bg-slate-800 text-white text-[10px] font-medium leading-snug rounded-lg px-3 py-2 shadow-lg`}>
          {text}
        </div>
      )}

      {/* Popover panduan */}
      {open && (
        <div className={`absolute z-50 top-full mt-2 ${alignClass} w-72 max-w-[80vw] bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 text-left`}>
          <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">{text}</p>
          {steps && steps.length > 0 && (
            <ol className="mt-2.5 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-slate-500 leading-snug">
                  <span className="h-4 w-4 shrink-0 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-extrabold flex items-center justify-center">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
          <button
            onClick={() => setOpen(false)}
            className="mt-3 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      )}
    </div>
  );
}

/** Pembungkus judul box + ikon bantuan di kanan atas. */
export function HelpTitle({ title, icon, help, steps, right }: {
  title: string;
  icon?: ReactNode;
  help: string;
  steps?: string[];
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-bold text-slate-800 text-sm leading-none">{title}</h4>
        <HelpBadge text={help} steps={steps} />
      </div>
      {right}
    </div>
  );
}
