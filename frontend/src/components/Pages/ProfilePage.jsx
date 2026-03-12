import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './ProfilePage.css';

const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [preferences, setPreferences] = useState({
        favoriteOccasions: [],
        priceRange: 'mid',
        preferredBrands: '',
        styleGoals: '',
        dislikes: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
<<<<<<< HEAD
            const response = await api.get('/profile');
=======
            const token = localStorage.getItem('token');
            const response = await axios.get('https://ai-stylist-6l22.onrender.com/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
>>>>>>> 3239da67e6695471f4e2792b8c7beefc71a305cd

            if (response.data.success) {
                setProfile(response.data.profile);
                if (response.data.profile?.preferences) {
                    setPreferences(response.data.profile.preferences);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePreferences = async () => {
        try {
<<<<<<< HEAD
            const response = await api.put(
                '/profile/preferences',
                { preferences }
=======
            const token = localStorage.getItem('token');
            const response = await axios.put(
                'https://ai-stylist-6l22.onrender.com/api/profile/preferences',
                { preferences },
                { headers: { Authorization: `Bearer ${token}` } }
>>>>>>> 3239da67e6695471f4e2792b8c7beefc71a305cd
            );

            if (response.data.success) {
                setEditMode(false);
                fetchProfile();
                alert('Preferences saved successfully!');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('Failed to save preferences');
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
        if (profile.preferences && Object.keys(profile.preferences).length > 0) completed++;

        return Math.round((completed / total) * 100);
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="loader">Loading your profile...</div>
            </div>
        );
    }

    if (!profile || !profile.physical) {
        return (
            <div className="profile-empty">
                <div className="empty-icon">ðŸ“¸</div>
                <h2>No Profile Yet</h2>
                <p>Upload a photo to get your personalized style profile!</p>
                <button
                    className="btn-upload-photo"
                    onClick={() => navigate('/dashboard/upload')}
                >
                    Upload Photo Now
                </button>
            </div>
        );
    }

    const completion = calculateCompletion();

    return (
        <div className="profile-page">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                    <h1>{user?.name}</h1>
                    <p className="profile-since">
                        Style profile since {new Date(profile.analyzedAt).toLocaleDateString()}
                    </p>
                    <div className="profile-score">Style Score: {completion}/100</div>
                </div>
                <div className="profile-actions">
                    <button className="btn-action" onClick={() => navigate('/dashboard/upload')}>
                        ðŸ“¸ Retake Analysis
                    </button>
                </div>
            </div>

            {/* Completion Progress */}
            <div className="completion-section">
                <h3>Profile Completion</h3>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${completion}%` }}
                    ></div>
                </div>
                <p className="progress-text">{completion}% Complete</p>
            </div>

            {/* Style DNA */}
            <div className="section-title">
                <span className="section-icon">ðŸ§¬</span>
                <h2>Your Style DNA</h2>
            </div>

            <div className="dna-grid">
                {/* Physical Features */}
                <div className="dna-card">
                    <h3>Physical Features</h3>
                    <div className="feature-item">
                        <label>Face Shape</label>
                        <div className="feature-value-big">
                            {profile.physical.faceShape?.type}
                            <span className="confidence">
                                {Math.round((profile.physical.faceShape?.confidence || 0.8) * 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <label>Skin Tone</label>
                        <div className="skin-display">
                            <div
                                className="skin-color"
                                style={{ backgroundColor: profile.physical.skinTone?.hex }}
                            ></div>
                            <div className="skin-info">
                                <div>{profile.physical.skinTone?.category}</div>
                                <small>{profile.physical.skinTone?.undertone} undertone</small>
                            </div>
                        </div>
                    </div>
                    {profile.physical.facialSymmetry !== undefined && (
                        <div className="feature-item">
                            <label>Facial Symmetry</label>
                            <div className="symmetry-meter">
                                <div
                                    className="symmetry-bar"
                                    style={{ width: `${profile.physical.facialSymmetry * 100}%` }}
                                ></div>
                            </div>
                            <small>{Math.round(profile.physical.facialSymmetry * 100)}%</small>
                        </div>
                    )}
                </div>

                {/* Body Type */}
                {profile.bodyType && (
                    <div className="dna-card">
                        <h3>Body Type</h3>
                        <div className="body-type-display">
                            <div className="body-icon">ðŸ’ª</div>
                            <div className="body-category">{profile.bodyType.category}</div>
                            {profile.bodyType.build && (
                                <div className="body-detail">{profile.bodyType.build} Build</div>
                            )}
                            {profile.bodyType.recommendation && (
                                <p className="body-rec">{profile.bodyType.recommendation}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Style Personality */}
                {profile.stylePersonality && (
                    <div className="dna-card">
                        <h3>Style Personality</h3>
                        <div className="style-breakdown">
                            {profile.stylePersonality.primary && (
                                <div className="style-bar primary">
                                    <div className="style-label">Primary</div>
                                    <div className="style-name">{profile.stylePersonality.primary.type}</div>
                                    <div className="style-percent">{profile.stylePersonality.primary.percentage}%</div>
                                </div>
                            )}
                            {profile.stylePersonality.secondary && (
                                <div className="style-bar secondary">
                                    <div className="style-label">Secondary</div>
                                    <div className="style-name">{profile.stylePersonality.secondary.type}</div>
                                    <div className="style-percent">{profile.stylePersonality.secondary.percentage}%</div>
                                </div>
                            )}
                            {profile.stylePersonality.maturity && (
                                <div className="maturity-badge">
                                    {profile.stylePersonality.maturity}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Color Palette */}
            {profile.colorPalette && (
                <>
                    <div className="section-title">
                        <span className="section-icon">ðŸŽ¨</span>
                        <h2>Complete Color Palette</h2>
                    </div>

                    <div className="color-palette-section">
                        {/* Best Colors */}
                        {profile.colorPalette.best && profile.colorPalette.best.length > 0 && (
                            <div className="color-group">
                                <h3>Best Colors</h3>
                                <div className="color-grid">
                                    {profile.colorPalette.best.map((color, idx) => (
                                        <div key={idx} className="color-item">
                                            <div
                                                className="color-swatch"
                                                style={{ backgroundColor: color.hex }}
                                            ></div>
                                            <div className="color-name">{color.name}</div>
                                            {color.reason && <div className="color-reason">{color.reason}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Accent Colors */}
                        {profile.colorPalette.accent && profile.colorPalette.accent.length > 0 && (
                            <div className="color-group">
                                <h3>Accent Colors</h3>
                                <div className="color-grid">
                                    {profile.colorPalette.accent.map((color, idx) => (
                                        <div key={idx} className="color-item">
                                            <div
                                                className="color-swatch"
                                                style={{ backgroundColor: color.hex }}
                                            ></div>
                                            <div className="color-name">{color.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Neutrals */}
                        {profile.colorPalette.neutrals && (
                            <div className="neutrals-list">
                                <strong>Neutral Staples:</strong> {profile.colorPalette.neutrals.join(', ')}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Recommendations */}
            {profile.recommendations && (
                <>
                    <div className="section-title">
                        <span className="section-icon">ðŸ’¡</span>
                        <h2>Personalized Recommendations</h2>
                    </div>

                    <div className="recommendations-grid">
                        {profile.recommendations.necklines && (
                            <div className="rec-card">
                                <h4>Best Necklines</h4>
                                <ul>
                                    {profile.recommendations.necklines.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profile.recommendations.fits && (
                            <div className="rec-card">
                                <h4>Ideal Fits</h4>
                                <ul>
                                    {profile.recommendations.fits.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profile.recommendations.accessories && (
                            <div className="rec-card">
                                <h4>Accessories</h4>
                                <ul>
                                    {profile.recommendations.accessories.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {profile.recommendations.direction && (
                        <div className="style-direction-card">
                            <h4>Your Style Direction</h4>
                            <p>{profile.recommendations.direction}</p>
                        </div>
                    )}
                </>
            )}

            {/* Preferences (Editable) */}
            <div className="section-title">
                <span className="section-icon">âš™ï¸</span>
                <h2>Style Preferences</h2>
                {!editMode && (
                    <button className="btn-edit" onClick={() => setEditMode(true)}>
                        Edit
                    </button>
                )}
            </div>

            <div className="preferences-section">
                {editMode ? (
                    <div className="preferences-edit">
                        <div className="pref-field">
                            <label>Price Range</label>
                            <select
                                value={preferences.priceRange || 'mid'}
                                onChange={(e) => setPreferences({ ...preferences, priceRange: e.target.value })}
                            >
                                <option value="budget">Budget-friendly (&lt; â‚¹1000)</option>
                                <option value="mid">Mid-range (â‚¹1000-5000)</option>
                                <option value="premium">Premium (â‚¹5000+)</option>
                            </select>
                        </div>

                        <div className="pref-field">
                            <label>Preferred Brands (comma separated)</label>
                            <input
                                type="text"
                                value={preferences.preferredBrands || ''}
                                onChange={(e) => setPreferences({ ...preferences, preferredBrands: e.target.value })}
                                placeholder="e.g., Zara, H&M, Uniqlo"
                            />
                        </div>

                        <div className="pref-field">
                            <label>Style Goals</label>
                            <textarea
                                value={preferences.styleGoals || ''}
                                onChange={(e) => setPreferences({ ...preferences, styleGoals: e.target.value })}
                                placeholder="What do you want to achieve with your style?"
                                rows="3"
                            />
                        </div>

                        <div className="pref-field">
                            <label>Dislikes / Avoid</label>
                            <textarea
                                value={preferences.dislikes || ''}
                                onChange={(e) => setPreferences({ ...preferences, dislikes: e.target.value })}
                                placeholder="What styles or items do you want to avoid?"
                                rows="3"
                            />
                        </div>

                        <div className="pref-actions">
                            <button className="btn-cancel" onClick={() => setEditMode(false)}>
                                Cancel
                            </button>
                            <button className="btn-save" onClick={handleSavePreferences}>
                                Save Preferences
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="preferences-view">
                        <div className="pref-item">
                            <label>Price Range:</label>
                            <span>
                                {preferences.priceRange === 'budget' && 'Budget-friendly (< â‚¹1000)'}
                                {preferences.priceRange === 'mid' && 'Mid-range (â‚¹1000-5000)'}
                                {preferences.priceRange === 'premium' && 'Premium (â‚¹5000+)'}
                            </span>
                        </div>
                        {preferences.preferredBrands && (
                            <div className="pref-item">
                                <label>Preferred Brands:</label>
                                <span>{preferences.preferredBrands}</span>
                            </div>
                        )}
                        {preferences.styleGoals && (
                            <div className="pref-item">
                                <label>Style Goals:</label>
                                <span>{preferences.styleGoals}</span>
                            </div>
                        )}
                        {preferences.dislikes && (
                            <div className="pref-item">
                                <label>Dislikes:</label>
                                <span>{preferences.dislikes}</span>
                            </div>
                        )}
                        {!preferences.preferredBrands && !preferences.styleGoals && (
                            <p className="no-prefs">No preferences set yet. Click Edit to add your preferences!</p>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="section-title">
                <span className="section-icon">âš¡</span>
                <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions-grid">
                <div className="action-card" onClick={() => navigate('/dashboard/outfits')}>
                    <span className="action-icon">ðŸŽ¨</span>
                    <h4>Create Outfit</h4>
                    <p>Based on your profile</p>
                </div>
                <div className="action-card" onClick={() => navigate('/dashboard/chat')}>
                    <span className="action-icon">ðŸ’¬</span>
                    <h4>Ask AI Stylist</h4>
                    <p>Get personalized advice</p>
                </div>
                <div className="action-card" onClick={() => navigate('/dashboard/upload')}>
                    <span className="action-icon">ðŸ“¸</span>
                    <h4>Update Analysis</h4>
                    <p>Retake your photo</p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
