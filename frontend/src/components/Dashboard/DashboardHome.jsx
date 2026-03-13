import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import './DashboardHome.css';

const DashboardHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({
        outfitsCreated: 0,
        challengesJoined: 0,
        styleScore: 0
    });

    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/profile');
            if (response.data.success) {
                setProfile(response.data.profile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

const fetchStats = async () => {
    try {
        const response = await api.get('/dashboard/stats');
        if (response.data.success) {
            setStats({
                outfitsCreated: response.data.stats.totalOutfits || 0,
                challengesJoined: response.data.stats.challengesJoined || 0,
                styleScore: response.data.stats.styleScore || 0
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
};


    const calculateCompletion = () => {
        if (!profile) return 0;
        let completed = 0;
        let total = 5;
        if (profile.physical) completed++;
        if (profile.bodyType) completed++;
        if (profile.stylePersonality) completed++;
        if (profile.colorPalette) completed++;
        if (profile.preferences) completed++;
        return Math.round((completed / total) * 100);
    };

    return (
        <div className="dashboard-home">
            <div className="welcome-section">
                <h1>👋 Welcome back, {user?.name}!</h1>
                <p>Your personal AI stylist is ready to help you look your best</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🎨</div>
                    <div className="stat-content">
                        <h3>{stats.outfitsCreated}</h3>
                        <p>👗 Outfits Created</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-content">
                        <h3>{stats.challengesJoined}</h3>
                        <p>🏆 Challenges Joined</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-content">
                        <h3>{calculateCompletion()}%</h3>
                        <p>✅ Profile Complete</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <h2>⚡ Quick Actions</h2>
                <div className="actions-grid">
                    <div
                        className="action-card"
                        onClick={() => navigate('/dashboard/upload')}
                    >
                        <span className="action-icon">📸</span>
                        <h3>📸 Analyze Photo</h3>
                        <p>Get your personalized style profile</p>
                    </div>

                    <div
                        className="action-card"
                        onClick={() => navigate('/dashboard/outfits')}
                    >
                        <span className="action-icon">👔</span>
                        <h3>👗 Build Outfit</h3>
                        <p>Mix and match your perfect look</p>
                    </div>

                    <div
                        className="action-card"
                        onClick={() => navigate('/dashboard/chat')}
                    >
                        <span className="action-icon">💬</span>
                        <h3>💬 Ask AI Stylist</h3>
                        <p>Get personalized fashion advice</p>
                    </div>

                    <div
                        className="action-card"
                        onClick={() => navigate('/dashboard/profile')}
                    >
                        <span className="action-icon">👤</span>
                        <h3>👤 View Profile</h3>
                        <p>See your complete style analysis</p>
                    </div>
                </div>
            </div>

            {/* Profile Status */}
            {profile && profile.physical ? (
                <div className="profile-summary">
                    <h2>✨ Your Style Profile</h2>
                    <div className="profile-highlights">
                        <div className="highlight-item">
                            <label>Face Shape:</label>
                            <span>{profile.physical.faceShape?.type}</span>
                        </div>
                        <div className="highlight-item">
                            <label>Skin Tone:</label>
                            <span>{profile.physical.skinTone?.category}</span>
                        </div>
                        <div className="highlight-item">
                            <label>Body Type:</label>
                            <span>{profile.bodyType?.category}</span>
                        </div>
                        <div className="highlight-item">
                            <label>Style:</label>
                            <span>{profile.stylePersonality?.primary?.type}</span>
                        </div>
                    </div>
                    <button
                        className="btn-view-full"
                        onClick={() => navigate('/dashboard/profile')}
                    >
                        👁️ View Full Profile
                    </button>
                </div>
            ) : (
                <div className="profile-prompt">
                    <h2>✅ Complete Your Profile</h2>
                    <p>Upload a photo to get personalized style recommendations</p>
                    <button
                        className="btn-upload"
                        onClick={() => navigate('/dashboard/upload')}
                    >
                        📤 Upload Photo Now
                    </button>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
