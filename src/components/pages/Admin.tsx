import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2 } from "lucide-react";
import { TicketCategoryManager } from "./admin/TicketCategoryManager";
import { AdminSidebar } from "./admin/layout/AdminSidebar";
import { AdminTopBar } from "./admin/layout/AdminTopBar";
import { AdminOverview } from "./admin/views/Overview";
import { AdminAttendees } from "./admin/views/Attendees";
import { AdminSchedule } from "./admin/views/Schedule";
import { AdminSettings } from "./admin/views/Settings";
import { AdminUserManagement } from "./admin/views/UserManagement";
import { AdminSpeakers } from "./admin/views/Speakers";
import { AdminSessions } from "./admin/views/Sessions";
import { AdminAssignments } from "./admin/views/Assignments";
import { AdminCommunications } from "./admin/views/Communications";
import { AdminAccessCodes } from "./admin/views/AccessCodes";
import { AdminSales } from "./admin/views/Sales";
import { AdminModeration } from "./admin/views/Moderation";

export default function Admin() {
    const { user, profile, loading } = useAuth();

    // Dashboard state
    const [activeView, setActiveView] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (profile?.role !== "admin" && profile?.role !== "manager"))) {
            window.location.replace("/");
        }
    }, [user, profile, loading]);

    if (loading) {
        return (
            <div className="h-screen bg-[#f4f6f8] flex flex-col items-center justify-center text-gray-800">
                <Loader2 className="w-10 h-10 animate-spin text-[#00C853] mb-4" />
                <p className="text-gray-500 font-medium">Loading Admin Dashboard...</p>
            </div>
        );
    }

    if (profile?.role !== "admin" && profile?.role !== "manager") return null;

    const renderContent = () => {
        switch (activeView) {
            case 'overview': return <AdminOverview />;
            case 'attendees': return <AdminAttendees />;
            case 'users': return <AdminUserManagement />;
            case 'categories': return <TicketCategoryManager />;
            case 'codes': return <AdminAccessCodes />;
            case 'schedule': return <AdminSchedule />;
            case 'sessions': return <AdminSessions />;
            case 'speakers': return <AdminSpeakers />;
            case 'sales': return <AdminSales />;
            case 'moderation': return <AdminModeration />;
            case 'assignments': return <AdminAssignments />;
            case 'communications': return <AdminCommunications />;
            case 'settings': return <AdminSettings />;
            default: return <AdminOverview />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f6f8] font-sans selection:bg-green-100 selection:text-green-900">
            <AdminSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <AdminTopBar setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto pb-20">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}
