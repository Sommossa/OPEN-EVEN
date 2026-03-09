import React from 'react';
import {
    LayoutDashboard,
    Users,
    Settings,
    Ticket,
    LogOut,
    CalendarDays,
    ShieldAlert,
    UserCog,
    Menu,
    X,
    Megaphone,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AdminSidebarProps {
    activeView: string;
    setActiveView: (view: any) => void;
    isOpen?: boolean;
    setIsOpen?: (val: boolean) => void;
}

export function AdminSidebar({ activeView, setActiveView, isOpen, setIsOpen }: AdminSidebarProps) {
    const { profile } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = profile?.role === 'manager'
        ? [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'attendees', label: 'Registered Users', icon: Users },
            { id: 'schedule', label: 'Schedule', icon: CalendarDays },
            { id: 'sessions', label: 'Sessions', icon: CalendarDays },
            { id: 'assignments', label: 'Assignments', icon: ShieldAlert },
            { id: 'communications', label: 'Communications', icon: Megaphone },
        ]
        : [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'attendees', label: 'Registered Users', icon: Users },
            { id: 'users', label: 'User Management', icon: UserCog },
            { id: 'categories', label: 'Ticket Categories', icon: Ticket },
            { id: 'codes', label: 'Access Codes', icon: ShieldAlert },
            { id: 'schedule', label: 'Schedule', icon: CalendarDays },
            { id: 'sessions', label: 'Sessions', icon: CalendarDays },
            { id: 'speakers', label: 'Speakers', icon: Users },
            { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
            { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
            { id: 'assignments', label: 'Assignments', icon: ShieldAlert },
            { id: 'communications', label: 'Communications', icon: Megaphone },
            { id: 'settings', label: 'Settings', icon: Settings },
        ];

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 text-[#00C853] w-64 shadow-sm transition-all duration-300">
            <div className="p-5 flex items-center gap-3">
                <img src="/icons/OPEN_EVEN_LOGO.png" alt="OPEN EVEN Logo" className="w-8 h-8" />
                <div>
                    <h2 className="text-[#00C853] font-bold text-lg leading-tight tracking-wide">OPEN EVEN</h2>
                    <p className="text-xs text-gray-400 -mt-0.5">Admin Panel</p>
                </div>
                {setIsOpen && (
                    <button onClick={() => setIsOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-[#00C853]">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-0 space-y-0.5 mt-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveView(item.id);
                                if (setIsOpen) setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 border-l-4 ${isActive
                                ? 'bg-green-50 text-[#00C853] font-bold border-[#00C853]'
                                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-[#00C853]'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#00C853]' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="p-4 border-t border-gray-200 mt-auto">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block h-screen sticky top-0 bg-white">
                {sidebarContent}
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen?.(false)} />
                    <div className="relative z-50 h-full w-64 transform transition-transform duration-300 ease-in-out">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
