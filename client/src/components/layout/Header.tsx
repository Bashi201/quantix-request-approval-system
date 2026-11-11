import React, { useState, useEffect } from 'react';
import { Menu, Layers, Calendar, Clock } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="h-16 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs shrink-0 select-none">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 ring-2 ring-indigo-50">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-none font-heading truncate">
                Quantix
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                Enterprise
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline leading-tight mt-0.5">
              Service Request &amp; Workflow Governance
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live Date & Time Display (Desktop only) */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <span className="text-slate-300 font-bold">•</span>
        <div className="flex items-center gap-1.5 font-bold text-slate-900 font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Right: Notifications & User Profile Menu */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        <NotificationDropdown />
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        <UserMenu />
      </div>
    </header>
  );
};
