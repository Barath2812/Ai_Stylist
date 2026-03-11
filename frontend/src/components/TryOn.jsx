import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TryOn.css';

const TryOn = ({ product, userImagePath, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [errorType, setErrorType] = useState(null); // 'network' | 'timeout' | 'rate-limit' | 'server'
    const [progress, setProgress] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 120000; // 2 minutes for try-on

    useEffect(() => {
        // Auto-start try-on when component loads
        handleTryOn();
    }, []);

    // Simulate progress for better UX
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 10;
                });
            }, 500);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const classifyError = (err) => {
        if (!err) return { type: 'server', message: 'An unknown error occurred' };

        // Network errors (no response at all)
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
            return {
                type: 'network',
                message: 'Cannot connect to the server. Please check your internet connection and ensure the backend is running.',
                tips: ['Check if the backend server is running on port 5000', 'Verify your internet connection', 'Try refreshing the page']
            };
        }

        // Timeout errors
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            return {
                type: 'timeout',
                message: 'The try-on process took too long. This can happen when the AI model is warming up.',
                tips: ['Try again — the model may be ready now', 'Use a smaller or clearer image', 'The first attempt often takes longer']
            };
        }

        const status = err.response?.status;

        // Rate limiting
        if (status === 429) {
            return {
                type: 'rate-limit',
                message: 'Too many requests. The AI service is rate-limited.',
                tips: ['Wait 30 seconds before trying again', 'The free tier has limited requests per minute']
            };
        }

        // Auth errors
        if (status === 401 || status === 403) {
            return {
                type: 'server',
                message: 'API authentication failed. Check your Replicate API token.',
                tips: ['Verify REPLICATE_API_TOKEN in your .env file', 'Ensure the token has not expired']
            };
        }

        // Server errors
        if (status >= 500) {
            return {
                type: 'server',
                message: err.response?.data?.error || 'The server encountered an error processing your request.',
                tips: ['Try again in a few moments', 'Check backend logs for more details']
            };
        }

        // Client errors
        if (status >= 400) {
            return {
                type: 'server',
                message: err.response?.data?.error || 'Invalid request. Please check your inputs.',
                tips: ['Ensure your uploaded image is valid', 'Check that the product URL is accessible']
            };
        }

        return {
            type: 'server',
            message: err.response?.data?.error || err.message || 'Virtual try-on failed',
            tips: ['Try again', 'Check if the backend server is running']
        };
    };

    const handleTryOn = async (isRetry = false) => {
        setLoading(true);
        setError(null);
        setErrorType(null);
        setProgress(10);

        if (!isRetry) {
            setRetryCount(0);
        }

        try {
            console.log('🎨 Starting virtual try-on...');
            console.log('User Image:', userImagePath);
            console.log('Product:', product.name);

            const response = await axios.post('http://localhost:5000/api/virtual-tryon', {
                userImagePath: userImagePath,
                productImageUrl: product.image
            }, {
                timeout: TIMEOUT_MS
            });

            if (response.data.success) {
                console.log('✅ Virtual try-on successful!');
                setProgress(100);
                setRetryCount(0);
                setTimeout(() => {
                    setResult(response.data.resultImageBase64);
                    setLoading(false);
                }, 500);
            } else {
                throw new Error(response.data.error || 'Try-on failed');
            }

        } catch (err) {
            console.error('❌ Try-on error:', err);
            const classified = classifyError(err);

            // Auto-retry for server errors and rate limits
            const currentRetry = isRetry ? retryCount : 0;
            if ((classified.type === 'server' || classified.type === 'rate-limit') && currentRetry < MAX_RETRIES) {
                const delay = Math.pow(2, currentRetry) * 1000; // 1s, 2s, 4s
                console.log(`🔄 Retrying in ${delay / 1000}s (attempt ${currentRetry + 1}/${MAX_RETRIES})...`);
                setRetryCount(prev => prev + 1);
                setProgress(5);
                setTimeout(() => handleTryOn(true), delay);
                return;
            }

            setError(classified.message);
            setErrorType(classified.type);
            setLoading(false);
            setProgress(0);
        }
    };

    return (
        <div className="tryon-container">
            <div className="tryon-header">
                <button onClick={onBack} className="back-button">
                    ← Back to Products
                </button>
                <h2>Virtual Try-On</h2>
                <p className="product-name">{product.name} - {product.price}</p>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="tryon-loading">
                    <div className="loading-animation">
                        <div className="spinner"></div>
                        <h3>Creating Your Virtual Try-On...</h3>
                        <p>This takes about 10-15 seconds</p>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="progress-text">{Math.round(progress)}%</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="tryon-error">
                    <div className="error-card">
                        <span className="error-icon">⚠️</span>
                        <h3>Oops! Something went wrong</h3>
                        <p>{error}</p>
                        <div className="error-actions">
                            <button onClick={handleTryOn} className="retry-button">
                                🔄 Try Again
                            </button>
                            <button onClick={onBack} className="back-button-alt">
                                ← Back to Products
                            </button>
                        </div>
                        <div className="error-help">
                            <p><strong>Troubleshooting:</strong></p>
                            <ul>
                                <li>Make sure your Google Colab notebook is running</li>
                                <li>Check if the Colab URL is correct in .env file</li>
                                <li>The first try-on might take longer (model warming up)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Result State */}
            {result && !loading && (
                <div className="tryon-result">
                    <div className="result-grid">
                        {/* Product Image */}
                        <div className="comparison-item">
                            <h3>Selected Product</h3>
                            <div className="image-card">
                                <img src={product.image} alt={product.name} />
                            </div>
                            <p className="image-label">Original Product</p>
                        </div>

                        {/* Arrow */}
                        <div className="comparison-arrow">
                            <span>→</span>
                        </div>

                        {/* Result Image */}
                        <div className="comparison-item">
                            <h3>You Wearing It! 🎉</h3>
                            <div className="image-card result-card">
                                <img 
                                    src={`data:image/jpeg;base64,${result}`} 
                                    alt="Virtual Try-On Result" 
                                />
                            </div>
                            <p className="image-label">Virtual Try-On Result</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="result-actions">
                        <button onClick={handleTryOn} className="try-again-button">
                            🔄 Try Again
                        </button>
                        <a 
                            href={product.buyLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="buy-button"
                        >
                            🛒 Buy This Product
                        </a>
                        <button onClick={onBack} className="back-button-primary">
                            ← Try Other Products
                        </button>
                    </div>

                    {/* Download Option */}
                    <div className="download-section">
                        <a 
                            href={`data:image/jpeg;base64,${result}`} 
                            download={`tryon-${product.name}.jpg`}
                            className="download-button"
                        >
                            💾 Download Image
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TryOn;