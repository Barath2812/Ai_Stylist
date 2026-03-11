import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ColorPalette.css';

const ColorPalettePage = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedColor, setCopiedColor] = useState(null);
    const [activeTab, setActiveTab] = useState('best');
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success && response.data.profile) {
                setProfile(response.data.profile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (hex, name) => {
        navigator.clipboard.writeText(hex);
        setCopiedColor(name);
        setTimeout(() => setCopiedColor(null), 2000);
    };

    const palette = profile?.colorPalette;

    if (loading) {
        return (
            <div className="color-page">
                <div className="color-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your color palette...</p>
                </div>
            </div>
        );
    }

    if (!palette || !palette.best || palette.best.length === 0) {
        return (
            <div className="color-page">
                <div className="color-empty">
                    <div className="empty-icon">🎨</div>
                    <h2>No Color Palette Yet</h2>
                    <p>Upload a photo to get your personalized color analysis based on your skin tone and features.</p>
                    <button className="btn-analyze" onClick={() => navigate('/dashboard/upload')}>
                        Analyze My Colors
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: 'best', label: 'Best Colors', emoji: '✨', count: palette.best?.length || 0 },
        { key: 'accent', label: 'Accent Colors', emoji: '💎', count: palette.accent?.length || 0 },
        { key: 'avoid', label: 'Avoid', emoji: '🚫', count: palette.avoid?.length || 0 },
        { key: 'neutrals', label: 'Neutrals', emoji: '⚪', count: palette.neutrals?.length || 0 }
    ];

    const renderColorCard = (color, index) => {
        if (typeof color === 'string') {
            return (
                <div key={index} className="color-card neutral-card" style={{ animationDelay: `${index * 0.08}s` }}>
                    <div className="color-preview-circle" style={{ background: '#888' }}></div>
                    <div className="color-details">
                        <h4>{color}</h4>
                        <p className="color-type">Neutral Staple</p>
                    </div>
                </div>
            );
        }

        return (
            <div
                key={index}
                className={`color-card ${activeTab === 'avoid' ? 'avoid-card' : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
                onClick={() => copyToClipboard(color.hex, color.name)}
            >
                <div className="color-preview" style={{ background: color.hex }}>
                    <div className="color-hex-overlay">
                        {copiedColor === color.name ? '✓ Copied!' : color.hex}
                    </div>
                </div>
                <div className="color-details">
                    <h4>{color.name}</h4>
                    {color.reason && <p className="color-reason">{color.reason}</p>}
                    <span className="color-hex-badge">{color.hex}</span>
                </div>
            </div>
        );
    };

    const getActiveColors = () => {
        switch (activeTab) {
            case 'best': return palette.best || [];
            case 'accent': return palette.accent || [];
            case 'avoid': return palette.avoid || [];
            case 'neutrals': return palette.neutrals || [];
            default: return [];
        }
    };

    return (
        <div className="color-page">
            <div className="color-header">
                <h1>Your Color Palette</h1>
                <p>Colors personalized to your skin tone, undertone, and features</p>

                {profile?.physical?.skinTone && (
                    <div className="skin-info-bar">
                        <div className="skin-chip">
                            <div
                                className="skin-dot"
                                style={{ background: profile.physical.skinTone.hex || '#C68642' }}
                            ></div>
                            <span>{profile.physical.skinTone.category} Skin</span>
                        </div>
                        {profile.physical.skinTone.undertone && (
                            <div className="skin-chip">
                                <span>🌡️ {profile.physical.skinTone.undertone} Undertone</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="color-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`color-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="tab-emoji">{tab.emoji}</span>
                        <span className="tab-label">{tab.label}</span>
                        <span className="tab-count">{tab.count}</span>
                    </button>
                ))}
            </div>

            <div className="colors-grid">
                {getActiveColors().map((color, i) => renderColorCard(color, i))}
            </div>

            {activeTab === 'best' && (
                <div className="color-tip">
                    <span className="tip-icon">💡</span>
                    <p>Click any color to copy its hex code. Use these as your go-to wardrobe colors!</p>
                </div>
            )}
        </div>
    );
};

export default ColorPalettePage;
