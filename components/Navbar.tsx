'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift, Search, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; provider: string } | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDbStatus({
            connected: data.data.dbConnected,
            provider: data.data.dbProvider,
          });
        }
      })
      .catch(() => {
        setDbStatus({ connected: false, provider: 'mysql' });
      });
  }, []);

  const navLinks = [
    { href: '/', label: 'Notify Gift', icon: Gift },
    { href: '/consultar', label: 'Lookup Code', icon: Search },
    { href: '/admin', label: 'Admin Panel', icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform duration-200">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SearchFriend
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Secret Santa · 100% Anonymous</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* DB Status Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
          <span
            className={`w-2 h-2 rounded-full ${
              dbStatus?.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
            }`}
          />
          <span>
            {dbStatus
              ? `${dbStatus.provider.toUpperCase()} (${dbStatus.connected ? 'XAMPP OK' : 'Disconnected'})`
              : 'Checking DB...'}
          </span>
        </div>
      </div>
    </header>
  );
}
