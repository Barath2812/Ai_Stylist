import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './History.css';

const HistoryPage = () => {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            if (response.data.success) {
                setAnalyses(response.data.recentAnalyses || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOccasionEmoji = (occasion) => {
        const emojis = {
            'Formal': '🎩',
            'Semi-Formal': '👔',
            'Casual': '👕',
            'Party': '🎉',
            'Wedding': '💍',
            'Date': '❤️',
            'Office': '💼',
            'Interview': '📋'
        };
        return emojis[occasion] || '🎨';
    };

    if (loading) {
        return (
            <div className="history-page">
                <div className="history-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your style history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="history-header">
                <h1>Style History</h1>
                <p>Track your style evolution over time</p>
                <div className="history-stats-bar">
                    <div className="history-stat">
                        <span className="stat-number">{analyses.length}</span>
                        <span className="stat-label">Analyses</span>
                    </div>
                </div>
            </div>

            {analyses.length === 0 ? (
                <div className="history-empty">
                    <div className="empty-icon">📊</div>
                    <h2>No Style History Yet</h2>
                    <p>Start by uploading a photo to get your first style analysis. Each analysis will be tracked here so you can see your style evolution.</p>
                    <button className="btn-start" onClick={() => navigate('/dashboard/upload')}>
                        Start Your First Analysis
                    </button>
                </div>
            ) : (
                <div className="history-timeline">
                    {analyses.map((analysis, index) => (
                        <div
                            key={index}
                            className="timeline-card"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="timeline-marker">
                                <div className="marker-dot"></div>
                                {index < analyses.length - 1 && <div className="marker-line"></div>}
                            </div>

                            <div className="timeline-content">
                                <div className="timeline-date">
                                    <span className="date">{formatDate(analysis.date)}</span>
                                    <span className="time">{formatTime(analysis.date)}</span>
                                </div>

                                <div className="timeline-body">
                                    <div className="analysis-occasion">
                                        <span className="occasion-emoji">{getOccasionEmoji(analysis.occasion)}</span>
                                        <span className="occasion-text">{analysis.occasion || 'General'}</span>
                                    </div>

                                    <div className="analysis-details">
                                        {analysis.faceShape && (
                                            <div className="detail-chip">
                                                <span className="chip-icon">📐</span>
                                                <span>{analysis.faceShape}</span>
                                            </div>
                                        )}
                                        {analysis.skinTone && (
                                            <div className="detail-chip">
                                                <span className="chip-icon">🎨</span>
                                                <span>{analysis.skinTone}</span>
                                            </div>
                                        )}
                                        {analysis.colors && analysis.colors.length > 0 && (
                                            <div className="detail-chip">
                                                <span className="chip-icon">🌈</span>
                                                <span>{analysis.colors.length} Colors</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Display Curated Products if they exist in this history record */}
                                    {analysis.products && Object.keys(analysis.products).length > 0 && (
                                        <div className="history-products-section">
                                            <h4 className="history-products-title">Curated Products</h4>
                                            <div className="history-scrolling-products">
                                                {Object.entries(analysis.products).map(([category, items]) => {
                                                    if (!items || items.length === 0) return null;
                                                    // Just grab the first item from each category for a compact history view
                                                    const topItem = items[0];
                                                    return (
                                                        <a href={topItem.buyLink} target="_blank" rel="noopener noreferrer" key={`${index}-${category}`} className="history-product-card" title={topItem.name}>
                                                            <div className="history-product-image">
                                                                <img src={topItem.image} alt={topItem.name} loading="lazy" />
                                                            </div>
                                                            <div className="history-product-info">
                                                                <span className="history-product-category">{category}</span>
                                                                <span className="history-product-price">{topItem.price}</span>
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
