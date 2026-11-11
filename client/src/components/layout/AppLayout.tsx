import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CreateRequestModal } from '@/components/requests/CreateRequestModal';
import { EditRequestModal } from '@/components/requests/EditRequestModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col antialiased text-slate-800">
      {/* Top Application Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main Container */}
      <div className="flex-1 flex max-w-full">
        {/* Sticky Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modals / Windows */}
      <CreateRequestModal />
      <EditRequestModal />
    </div>
  );
};
