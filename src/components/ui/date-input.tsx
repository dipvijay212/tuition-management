"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayIn } from "@/lib/utilities/format";

/**
 * Date field that replaces <input type="date">. Values are "YYYY-MM-DD" strings (same as the native input).
 *
 * - Type the date as DD/MM/YYYY (slashes are added automatically), or
 * - pick it from the calendar button. Click the month/year title to jump by month or year.
 *
 * Works uncontrolled (`name` + `defaultValue`, posted with the form) or controlled (`value` + `onChange`).
 * `onChange` receives `{ target: { name, value } }`, so existing `(e) => e.target.value` handlers keep working.
 */
type DateInputProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string | null;
  onChange?: (e: { type: "change"; target: { name: string; value: string } }) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const GRID7: React.CSSProperties = { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" };
const GRID3: React.CSSProperties = { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parts = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const toText = (iso: string) => {
  if (!iso) return "";
  const { y, m, d } = parts(iso);
  return `${pad(d)}/${pad(m + 1)}/${y}`;
};
/** Keeps digits only and re-inserts slashes: "17112026" -> "17/11/2026". */
const mask = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
/** "17/11/2026" -> "2026-11-17", or null when it is not a real date. */
const parseText = (text: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate()) return null;
  return toIso(y, mo - 1, d);
};

type View = "days" | "months" | "years";

export function DateInput({
  id,
  name = "",
  value,
  defaultValue,
  onChange,
  onBlur,
  min,
  max,
  required,
  disabled,
  placeholder = "DD/MM/YYYY",
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: DateInputProps) {
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue && ISO.test(defaultValue) ? defaultValue : "");
  const current = controlled ? (ISO.test(value) ? value : "") : inner;

  // While the box has focus it shows what the user typed; otherwise it shows the saved date.
  // So incomplete or invalid text falls back to the last good date when the user leaves the box.
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const text = typing ? draft : toText(current);

  const today = React.useMemo(() => todayIn(), []);
  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const textIso = parseText(text);
  const textBad = typing && text.length === 10 && (!textIso || outOfRange(textIso));

  const commit = (iso: string) => {
    if (iso === current) return;
    if (!controlled) setInner(iso);
    onChange?.({ type: "change", target: { name, value: iso } });
  };

  const onType = (raw: string) => {
    const next = mask(raw);
    setDraft(next);
    if (next === "") return commit("");
    const iso = parseText(next);
    if (iso && !outOfRange(iso)) commit(iso);
  };

  const onTextBlur = () => {
    setTyping(false);
    onBlur?.();
  };

  // ---------- calendar ----------
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<View>("days");
  const start = parts(current || (max && today > max ? max : min && today < min ? min : today));
  const [view, setView] = React.useState({ y: start.y, m: start.m });

  const handleOpen = (next: boolean) => {
    if (next) {
      setView({ y: start.y, m: start.m });
      setMode("days");
    }
    setOpen(next);
  };
  const pick = (iso: string) => {
    commit(iso);
    setTyping(false);
    setOpen(false);
    onBlur?.();
  };

  const yearPageStart = view.y - (((view.y % 12) + 12) % 12);
  const step = (dir: 1 | -1) =>
    setView((v) => {
      if (mode === "years") return { ...v, y: v.y + dir * 12 };
      if (mode === "months") return { ...v, y: v.y + dir };
      const t = v.y * 12 + v.m + dir;
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    });

  const monthOff = (y: number, m: number) => (!!min && toIso(y, m, new Date(y, m + 1, 0).getDate()) < min) || (!!max && toIso(y, m, 1) > max);
  const yearOff = (y: number) => (!!min && y < parts(min).y) || (!!max && y > parts(max).y);

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cur = current ? parts(current) : null;
  const now = parts(today);

  const title = mode === "days" ? `${MONTHS[view.m]} ${view.y}` : mode === "months" ? String(view.y) : `${yearPageStart} – ${yearPageStart + 11}`;
  const cell = "rounded-md text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30";
  const active = "bg-primary font-semibold text-primary-foreground hover:bg-primary";
  const mark = "font-semibold text-primary ring-1 ring-inset ring-primary/40";

  return (
    <div
      className={cn(
        "relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        (ariaInvalid || textBad) && "border-destructive ring-3 ring-destructive/20",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || textBad || undefined}
        required={required}
        disabled={disabled}
        value={text}
        maxLength={10}
        onFocus={() => {
          setDraft(toText(current));
          setTyping(true);
        }}
        onChange={(e) => onType(e.target.value)}
        onBlur={onTextBlur}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && e.altKey) {
            e.preventDefault();
            handleOpen(true);
          }
        }}
        className="h-full min-w-0 flex-1 bg-transparent pl-2.5 text-base tabular-nums outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          aria-label="Open calendar"
          className="mr-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CalendarDays className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-72 gap-2 p-3">
          <div className="flex items-center justify-between gap-1">
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className="grid size-8 place-items-center rounded-md hover:bg-muted">
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "days"))}
              className="h-8 flex-1 rounded-md px-2 text-sm font-semibold hover:bg-muted"
              aria-label="Change month or year"
            >
              {title}
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className="grid size-8 place-items-center rounded-md hover:bg-muted">
              <ChevronRight className="size-4" />
            </button>
          </div>

          {mode === "days" && (
            <>
              <div className="grid text-center text-xs font-medium text-muted-foreground" style={GRID7}>
                {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid gap-0.5" style={GRID7}>
                {Array.from({ length: firstWeekday }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const iso = toIso(view.y, view.m, d);
                  const selected = iso === current;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={outOfRange(iso)}
                      onClick={() => pick(iso)}
                      aria-pressed={selected}
                      className={cn(cell, "h-8 tabular-nums", selected ? active : iso === today && mark)}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === "months" && (
            <div className="grid gap-1.5" style={GRID3}>
              {MONTHS.map((label, m) => {
                const selected = cur?.y === view.y && cur.m === m;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={monthOff(view.y, m)}
                    onClick={() => {
                      setView((v) => ({ ...v, m }));
                      setMode("days");
                    }}
                    className={cn(cell, "h-10", selected ? active : now.y === view.y && now.m === m && mark)}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {mode === "years" && (
            <div className="grid gap-1.5" style={GRID3}>
              {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((y) => (
                <button
                  key={y}
                  type="button"
                  disabled={yearOff(y)}
                  onClick={() => {
                    setView((v) => ({ ...v, y }));
                    setMode("months");
                  }}
                  className={cn(cell, "h-10 tabular-nums", cur?.y === y ? active : now.y === y && mark)}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <button
              type="button"
              disabled={outOfRange(today)}
              onClick={() => pick(today)}
              className="rounded-md px-2 py-1 font-medium text-primary hover:bg-muted disabled:opacity-40"
            >
              Today
            </button>
            {!required && current && (
              <button type="button" onClick={() => pick("")} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">
                Clear
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
