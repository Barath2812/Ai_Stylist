import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './TopBar.css';

const TopBar = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLightTheme, setIsLightTheme] = useState(() => {
        return document.body.classList.contains('light-theme');
    });

    const toggleTheme = () => {
        const nextTheme = !isLightTheme;
        setIsLightTheme(nextTheme);
        if (nextTheme) {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to search results page
            navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery(''); // Clear after search
        }
    };

    return (
        <div className="topbar">
            {/* Left Section */}
            <div className="topbar-left">
                <button className="menu-toggle" onClick={toggleSidebar}>
                    ☰
                </button>

                <form className="search-bar" onSubmit={handleSearch}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search products, outfits, colors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            {/* Right Section */}
            <div className="topbar-right">
                {/* Theme Toggle */}
                <button
                    className="topbar-icon theme-toggle-btn"
                    onClick={toggleTheme}
                    title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                    <span className="icon">{isLightTheme ? '🌙' : '☀️'}</span>
                </button>

                {/* Settings */}
                <button
                    className="topbar-icon settings-btn"
                    onClick={() => navigate('/dashboard/profile')}
                >
                    <span className="icon">⚙️</span>
                </button>

                {/* User Menu */}
                <div className="user-menu">
                    <button
                        className="user-menu-btn"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="user-avatar-small">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="user-name-small">{user?.name || 'User'}</span>
                        <span className="dropdown-arrow">▾</span>
                    </button>

                    {showUserMenu && (
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <p className="dropdown-name">{user?.name}</p>
                                <p className="dropdown-email">{user?.email}</p>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    navigate('/dashboard/profile');
                                    setShowUserMenu(false);
                                }}
                            >
                                <span>👤</span> Profile
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    navigate('/dashboard/profile');
                                    setShowUserMenu(false);
                                }}
                            >
                                <span>⚙️</span> Settings
                            </button>
                            <div className="dropdown-divider"></div>
                            <button
                                className="dropdown-item logout-item"
                                onClick={handleLogout}
                            >
                                <span>🚪</span> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
