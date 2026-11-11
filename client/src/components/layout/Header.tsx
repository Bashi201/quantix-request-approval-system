import React from 'react';
import { Menu, Layers } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight hidden sm:inline">
            Quantix <span className="font-normal text-slate-500 text-xs ml-1">SaaS Service Platform</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationDropdown />
        <div className="h-6 w-px bg-slate-200" />
        <UserMenu />
      </div>
    </header>
  );
};
