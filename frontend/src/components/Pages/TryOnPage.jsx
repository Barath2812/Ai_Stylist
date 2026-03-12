import React, { useState } from 'react';
import axios from 'axios';
import TryOn from '../TryOn';
import './TryOnPage.css';

const TryOnPage = () => {
    // State for initial form
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [productUrl, setProductUrl] = useState('');
    const [urlValid, setUrlValid] = useState(null); // null | true | false

    // State for transition to try-on
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [userImagePath, setUserImagePath] = useState('');
    const [showTryOn, setShowTryOn] = useState(false);

    // Dummy product to satisfy TryOn.jsx props
    const [productCache, setProductCache] = useState(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setError('');

        if (!selectedFile) return;

        // File type validation
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            setError('Please upload a JPEG, PNG, or WebP image.');
            e.target.value = '';
            return;
        }

        // File size validation
        if (selectedFile.size > MAX_FILE_SIZE) {
            const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
            setError(`Image is too large (${sizeMB}MB). Maximum size is 10MB.`);
            e.target.value = '';
            return;
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please upload your photo');
            return;
        }
        if (!productUrl) {
            setError('Please provide a garment image URL');
            return;
        }

        // URL validation
        try {
            new URL(productUrl);
        } catch {
            setError('Please enter a valid URL (e.g., https://example.com/shirt.jpg)');
            return;
        }

        setError('');
        setUploading(true);

        try {
            // 1. Upload the user image to get a local server path
            const formData = new FormData();
            formData.append('image', file);

            const uploadRes = await axios.post('https://ai-stylist-6l22.onrender.com/api/virtual-tryon/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data.success) {
                setUserImagePath(uploadRes.data.imagePath);

                // Construct a product object for TryOn component
                setProductCache({
                    name: "Custom Garment",
                    price: "Virtual",
                    image: productUrl,
                    buyLink: productUrl
                });

                setShowTryOn(true);
            } else {
                setError(uploadRes.data.error || 'Failed to upload photo');
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'ERR_NETWORK') {
                setError('Cannot connect to server. Please check if the backend is running.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Upload timed out. Please try again with a smaller image.');
            } else {
                setError(err.response?.data?.error || 'Failed to start try-on process');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleBack = () => {
        setShowTryOn(false);
        // We keep the uploaded userImagePath and file/preview so user doesn't have to re-upload their photo
    };

    if (showTryOn && productCache && userImagePath) {
        return (
            <div className="tryon-page-wrapper">
                <TryOn
                    product={productCache}
                    userImagePath={userImagePath}
                    onBack={handleBack}
                />
            </div>
        );
    }

    return (
        <div className="tryon-page-container">
            <div className="tryon-header-section">
                <h1>Virtual Try-On Station</h1>
                <p>Upload your photo and provide a garment URL to see how it looks on you!</p>
            </div>

            <div className="standalone-upload-form">
                {error && <div className="tryon-error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* User Photo Upload */}
                    <div className="form-group-tryon">
                        <label>1. Upload Your Photo</label>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                            For best results, upload a clear, full-body or half-body photo facing forward.
                        </p>

                        <label className="image-upload-area">
                            <input type="file" accept="image/*" onChange={handleFileChange} />
                            {preview ? (
                                <div className="image-preview-wrapper">
                                    <img src={preview} alt="Your Photo" />
                                    <button
                                        type="button"
                                        className="remove-image-btn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setFile(null);
                                            setPreview(null);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <span className="upload-icon">📸</span>
                                    <h3>Tap or Click to Upload</h3>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Garment URL Input */}
                    <div className="form-group-tryon">
                        <label>2. Garment Image URL</label>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                            Paste a direct link to an image of the clothing item you want to try on. (Ends with .jpg, .png, etc.)
                        </p>
                        <input
                            type="url"
                            className="product-url-input"
                            placeholder="https://example.com/shirt.jpg"
                            value={productUrl}
                            onChange={(e) => {
                                setProductUrl(e.target.value);
                                setUrlValid(null);
                                setError('');
                            }}
                        />
                        {productUrl && (
                            <div className="product-url-preview">
                                <img
                                    src={productUrl}
                                    alt="Garment Preview"
                                    onError={(e) => { 
                                        e.target.style.display = 'none';
                                        setUrlValid(false);
                                    }}
                                    onLoad={(e) => { 
                                        e.target.style.display = 'block';
                                        setUrlValid(true);
                                    }}
                                />
                                {urlValid === false && (
                                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                        ⚠️ Could not load image. Please check the URL.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="tryon-submit-btn"
                        disabled={uploading || !file || !productUrl}
                    >
                        {uploading ? (
                            <>
                                <div className="small-spinner"></div>
                                Preparing Magic...
                            </>
                        ) : 'Start Virtual Try-On ✨'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TryOnPage;
