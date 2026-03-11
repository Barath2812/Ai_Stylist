import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './Dashboard.css';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        if (isMobile) setSidebarOpen(false);
    }, [location.pathname, isMobile]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="dashboard-wrapper">
            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="sidebar-overlay show"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <div className={`dashboard-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* Top Navigation Bar */}
                <TopBar toggleSidebar={toggleSidebar} />

                {/* Page Content */}
                <div className="dashboard-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
