import { useState, useEffect } from 'react';
import axios from 'axios';
import './Result.css';

const Result = ({ result, reset }) => {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Products State
    const [products, setProducts] = useState(null);
    const [productsLoading, setProductsLoading] = useState(true);

    const { profile, imageQuality } = result;

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setProductsLoading(true);
                const response = await axios.post('https://ai-stylist-6l22.onrender.com/api/products/recommendations', {
                    profile: profile
                });

                if (response.data.success) {
                    setProducts(response.data.products);
                }
            } catch (err) {
                console.error("Failed to fetch product recommendations:", err);
            } finally {
                setProductsLoading(false);
            }
        };

        if (profile) {
            fetchProducts();
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            const response = await axios.post(
                'https://ai-stylist-6l22.onrender.com/api/profile/save',
                {
                    profile: profile,
                    photoUrl: result.userImagePath,
                    products: products
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setSaved(true);
                setTimeout(() => {
                    // Redirect to dashboard after save
                    window.location.href = '/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="result-page-v2">
            {/* Header */}
            <div className="result-header">
                <h1>Your Complete Style Profile</h1>
                <p>AI-powered personalized fashion analysis</p>
            </div>

            {/* Image Quality Badge */}
            {imageQuality && (
                <div className={`quality-badge quality-${imageQuality.lighting}`}>
                    <span className="badge-icon">📸</span>
                    Image Quality: {imageQuality.lighting} lighting, {imageQuality.clarity} clarity
                </div>
            )}

            {/* Main Grid */}
            <div className="profile-grid">

                {/* Physical Attributes */}
                <div className="profile-card">
                    <div className="card-header">
                        <span className="card-icon">👤</span>
                        <h2>Physical Analysis</h2>
                    </div>

                    <div className="attribute-item">
                        <label>Face Shape</label>
                        <div className="attribute-value-big">
                            {profile.physical.faceShape.type}
                            <span className="confidence-badge">
                                {Math.round(profile.physical.faceShape.confidence * 100)}% confidence
                            </span>
                        </div>
                        {profile.physical.faceShape.measurements && (
                            <div className="measurements">
                                <small>Ratio: {profile.physical.faceShape.measurements.lengthToWidthRatio}</small>
                            </div>
                        )}
                    </div>

                    <div className="attribute-item">
                        <label>Skin Tone</label>
                        <div className="skin-tone-display">
                            <div
                                className="skin-swatch"
                                style={{ backgroundColor: profile.physical.skinTone.hex }}
                            ></div>
                            <div className="skin-info">
                                <div className="attribute-value">
                                    {profile.physical.skinTone.category} ({profile.physical.skinTone.undertone})
                                </div>
                                <small>{profile.physical.skinTone.hex}</small>
                            </div>
                        </div>
                    </div>

                    <div className="attribute-item">
                        <label>Facial Symmetry</label>
                        <div className="symmetry-bar">
                            <div
                                className="symmetry-fill"
                                style={{ width: `${profile.physical.facialSymmetry * 100}%` }}
                            ></div>
                        </div>
                        <small>{Math.round(profile.physical.facialSymmetry * 100)}% symmetric</small>
                    </div>

                    {profile.physical.hair && (
                        <div className="attribute-item">
                            <label>Hair</label>
                            <div className="attribute-value">
                                {profile.physical.hair.color} • {profile.physical.hair.texture}
                            </div>
                        </div>
                    )}

                    {profile.physical.eyes && (
                        <div className="attribute-item">
                            <label>Eyes</label>
                            <div className="attribute-value">{profile.physical.eyes.color}</div>
                        </div>
                    )}
                </div>

                {/* Body Type */}
                <div className="profile-card">
                    <div className="card-header">
                        <span className="card-icon">💪</span>
                        <h2>Body Type</h2>
                    </div>

                    <div className="body-type-display">
                        <div className="body-category">{profile.bodyType.category}</div>
                        {profile.bodyType.build && (
                            <div className="body-detail">{profile.bodyType.build} Build</div>
                        )}
                        {profile.bodyType.shoulders && (
                            <div className="body-detail">{profile.bodyType.shoulders} Shoulders</div>
                        )}
                        <div className="body-recommendation">
                            {profile.bodyType.recommendation}
                        </div>
                    </div>
                </div>

                {/* Style Personality */}
                <div className="profile-card">
                    <div className="card-header">
                        <span className="card-icon">✨</span>
                        <h2>Style Personality</h2>
                    </div>

                    <div className="style-breakdown">
                        <div className="style-item primary">
                            <div className="style-label">Primary Style</div>
                            <div className="style-type">{profile.stylePersonality.primary.type}</div>
                            <div className="style-percentage">{profile.stylePersonality.primary.percentage}%</div>
                        </div>

                        {profile.stylePersonality.secondary && (
                            <div className="style-item secondary">
                                <div className="style-label">Secondary</div>
                                <div className="style-type">{profile.stylePersonality.secondary.type}</div>
                                <div className="style-percentage">{profile.stylePersonality.secondary.percentage}%</div>
                            </div>
                        )}

                        {profile.stylePersonality.accent && (
                            <div className="style-item accent">
                                <div className="style-label">Accent</div>
                                <div className="style-type">{profile.stylePersonality.accent.type}</div>
                                <div className="style-percentage">{profile.stylePersonality.accent.percentage}%</div>
                            </div>
                        )}

                        <div className="maturity-badge">
                            Fashion Maturity: {profile.stylePersonality.maturity}
                        </div>
                    </div>
                </div>

                {/* Color Palette - Full Width */}
                <div className="profile-card full-width">
                    <div className="card-header">
                        <span className="card-icon">🎨</span>
                        <h2>Your Complete Color Palette</h2>
                    </div>

                    <div className="color-sections">
                        {/* Best Colors */}
                        <div className="color-section">
                            <h3>Best Colors</h3>
                            <div className="color-grid">
                                {profile.colorPalette.best.map((color, idx) => (
                                    <div key={idx} className="color-card">
                                        <div
                                            className="color-preview"
                                            style={{ backgroundColor: color.hex }}
                                        ></div>
                                        <div className="color-name">{color.name}</div>
                                        {color.reason && <div className="color-reason">{color.reason}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Accent Colors */}
                        {profile.colorPalette.accent && profile.colorPalette.accent.length > 0 && (
                            <div className="color-section">
                                <h3>Accent Colors</h3>
                                <div className="color-grid">
                                    {profile.colorPalette.accent.map((color, idx) => (
                                        <div key={idx} className="color-card">
                                            <div
                                                className="color-preview"
                                                style={{ backgroundColor: color.hex }}
                                            ></div>
                                            <div className="color-name">{color.name}</div>
                                            {color.reason && <div className="color-reason">{color.reason}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Colors to Avoid */}
                        {profile.colorPalette.avoid && profile.colorPalette.avoid.length > 0 && (
                            <div className="color-section avoid-section">
                                <h3>Colors to Avoid</h3>
                                <div className="color-grid">
                                    {profile.colorPalette.avoid.map((color, idx) => (
                                        <div key={idx} className="color-card avoid-card">
                                            <div
                                                className="color-preview"
                                                style={{ backgroundColor: color.hex }}
                                            ></div>
                                            <div className="color-name">{color.name}</div>
                                            {color.reason && <div className="color-reason">{color.reason}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Neutral Staples */}
                        {profile.colorPalette.neutrals && (
                            <div className="neutrals-list">
                                <strong>Neutral Staples:</strong> {profile.colorPalette.neutrals.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="profile-card full-width">
                    <div className="card-header">
                        <span className="card-icon">💡</span>
                        <h2>Personalized Recommendations</h2>
                    </div>

                    <div className="recommendations-grid">
                        {profile.recommendations.necklines && (
                            <div className="rec-group">
                                <h4>Best Necklines</h4>
                                <ul>
                                    {profile.recommendations.necklines.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profile.recommendations.fits && (
                            <div className="rec-group">
                                <h4>Ideal Fits</h4>
                                <ul>
                                    {profile.recommendations.fits.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profile.recommendations.accessories && (
                            <div className="rec-group">
                                <h4>Suggested Accessories</h4>
                                <ul>
                                    {profile.recommendations.accessories.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {profile.recommendations.direction && (
                        <div className="style-direction">
                            <h4>Style Direction</h4>
                            <p>{profile.recommendations.direction}</p>
                        </div>
                    )}

                    {profile.recommendations.seasonal && (
                        <div className="seasonal-tip">
                            <h4>Seasonal Tip</h4>
                            <p>{profile.recommendations.seasonal}</p>
                        </div>
                    )}
                </div>

                {/* AI Curated Products Section */}
                <div className="profile-card full-width">
                    <div className="card-header">
                        <span className="card-icon">🛍️</span>
                        <h2>Curated For You</h2>
                    </div>

                    {productsLoading ? (
                        <div className="products-loading">
                            <div className="spinner"></div>
                            <p>Finding the perfect matches for your style profile...</p>
                        </div>
                    ) : products ? (
                        <div className="curated-products-container">
                            {Object.entries(products).map(([category, items]) => {
                                if (!items || items.length === 0) return null;

                                const categoryTitles = {
                                    shirt: "Tops & Shirts",
                                    pant: "Trousers & Bottoms",
                                    shoes: "Footwear",
                                    watch: "Watches",
                                    accessories: "Accessories"
                                };

                                return (
                                    <div key={category} className="product-category-row">
                                        <h3>{categoryTitles[category] || category}</h3>
                                        <div className="scrolling-product-grid">
                                            {items.map(product => (
                                                <a href={product.buyLink} target="_blank" rel="noopener noreferrer" key={product.id} className="curated-product-card">
                                                    <div className="product-image-wrap">
                                                        <img src={product.image} alt={product.name} loading="lazy" />
                                                        {product.discount && <span className="product-discount">{product.discount}</span>}
                                                    </div>
                                                    <div className="product-details">
                                                        <span className="product-brand">{product.brand || 'Premium Brand'}</span>
                                                        <span className="product-name" title={product.name}>{product.name}</span>
                                                        <div className="product-price-row">
                                                            <span className="product-price">{product.price}</span>
                                                            {product.originalPrice && <span className="product-original-price">{product.originalPrice}</span>}
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="products-empty">
                            <p>Failed to load curated products.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="result-actions">
                <button
                    className="btn-back"
                    onClick={reset}
                    disabled={saving}
                >
                    ← Analyze Another Photo
                </button>

                <button
                    className="btn-save-profile"
                    onClick={handleSaveProfile}
                    disabled={saving || saved}
                >
                    {saving ? 'Saving...' : saved ? '✓ Profile Saved!' : '💾 Save My Profile'}
                </button>
            </div>

            {saved && (
                <div className="success-message">
                    Profile saved successfully! Redirecting to dashboard...
                </div>
            )}
        </div>
    );
};

export default Result;
