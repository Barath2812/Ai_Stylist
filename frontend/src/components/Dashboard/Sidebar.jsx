import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user } = useAuth();

    const navItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: '🏠',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            name: 'Upload Photo',
            path: '/dashboard/upload',
            icon: '📸',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
            name: 'Virtual Try-On',
            path: '/dashboard/tryon',
            icon: '✨',
            gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
        },
        {
            name: 'My Outfits',
            path: '/dashboard/outfits',
            icon: '👔',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            name: 'Style Chat',
            path: '/dashboard/chat',
            icon: '💬',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
            name: 'Color Palette',
            path: '/dashboard/colors',
            icon: '🎨',
            gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)'
        },
        {
            name: 'Style History',
            path: '/dashboard/history',
            icon: '📈',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        },
        {
            name: 'Profile',
            path: '/dashboard/profile',
            icon: '👤',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
    ];

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            {/* Logo Section */}
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon"></span>
                    {isOpen && <span className="logo-text">AI Stylist</span>}
                </div>
            </div>

            {/* User Info */}
            {isOpen && user && (
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                        <p className="user-name">{user.name}</p>
                        <p className="user-email">{user.email}</p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        style={{
                            '--item-gradient': item.gradient
                        }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {isOpen && <span className="nav-text">{item.name}</span>}
                        {isOpen && <span className="nav-arrow">→</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Toggle Button */}
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                {isOpen ? '«' : '»'}
            </button>
        </div>
    );
};

export default Sidebar;
