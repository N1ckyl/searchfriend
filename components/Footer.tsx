import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/60 py-8 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <p>
              <strong className="text-slate-200">Strict Privacy:</strong> The sender never enters their name, phone number, or personal data.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>for gift exchanges · Next.js + MySQL (XAMPP)</span>
          </div>

          <div className="text-slate-400 text-[11px]">
            <span>Architecture ready to migrate to </span>
            <span className="text-emerald-400 font-semibold">Supabase + Vercel</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
