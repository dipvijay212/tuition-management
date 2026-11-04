import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15"><GraduationCap className="size-6" /></span>
          Tuition Manager
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">Run your whole institute from one place.</h1>
          <p className="text-primary-foreground/80">Admissions, attendance, fees, exams, homework and parent communication, all connected and secure.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">Secure role-based access for admins, teachers, students and parents.</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute top-1/3 -right-10 size-40 rounded-full bg-white/5" />
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
