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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-none">
              Quantix
            </span>
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline leading-tight">
              Enterprise Service Platform
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live Date & Time Display */}
      <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <span className="text-slate-300 font-semibold">•</span>
        <div className="flex items-center gap-1.5 font-bold text-slate-900 font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Right: Notifications & User Profile Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Compact time on mobile */}
        <div className="md:hidden flex items-center gap-1 text-[11px] font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-100">
          <Clock className="w-3 h-3 text-indigo-500" />
          <span>
            {currentDateTime.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <NotificationDropdown />
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        <UserMenu />
      </div>
    </header>
  );
};
