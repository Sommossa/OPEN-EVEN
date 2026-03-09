import React from 'react';
import { Menu, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface AdminTopBarProps {
    setSidebarOpen: (val: boolean) => void;
}

export function AdminTopBar({ setSidebarOpen }: AdminTopBarProps) {
    const { profile } = useAuth();

    return (
        <header className="bg-[#00C853] border-b border-[#007B33] text-white sticky top-0 z-40 shadow-md">
            <div className="flex items-center justify-between px-6 h-16">

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 -ml-2 text-green-100 hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            OPEN EVEN 2026
                        </h1>
                        <div className="text-sm text-green-100 flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            Admin Dashboard
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="hidden sm:flex items-center gap-2 px-4 py-1.5 text-sm font-medium border border-white/40 text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        View Site
                    </a>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">{profile?.displayName || 'Admin'}</p>
                            <p className="text-xs text-green-100 capitalize">{profile?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white text-[#00C853] flex items-center justify-center font-bold shadow-sm">
                            {profile?.displayName?.charAt(0) || 'A'}
                        </div>
                    </div>
                </div>

            </div>
        </header>
    );
}

