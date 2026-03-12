import { useState } from 'react';
import axios from 'axios';

const UploadForm = ({ setResult, setLoading, setError, loading }) => {
    const [file, setFile] = useState(null);
    const [occasion, setOccasion] = useState('Casual');
    const [preview, setPreview] = useState(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setError('');

        if (!selectedFile) return;

        // File type check
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            setError('Please upload a JPEG, PNG, or WebP image.');
            e.target.value = '';
            return;
        }

        // File size check
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
        if (!file) return;

        setLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('occasion', occasion);

        try {
            const response = await axios.post('https://ai-stylist-6l22.onrender.com/api/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000 // 60s timeout for analysis
            });
            setResult(response.data);
        } catch (err) {
            if (err.code === 'ERR_NETWORK') {
                setError('Cannot connect to server. Please check if the backend is running.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Analysis timed out. Please try again with a smaller image.');
            } else if (err.response?.status >= 500) {
                setError('Server error during analysis. Please try again.');
            } else {
                setError(err.response?.data?.error || 'Something went wrong');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                <div className="occasion-select" style={{ width: '100%', maxWidth: '300px' }}>
                    <label>Select Occasion</label>
                    <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                        <option value="Casual">Casual</option>
                        <option value="Semi-Formal">Semi-Formal</option>
                        <option value="Formal">Formal</option>
                        <option value="Business">Business</option>
                        <option value="Party">Party</option>
                    </select>
                </div>

                <label className="upload-area" style={{ width: '100%', maxWidth: '500px' }}>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    {preview ? (
                        <div className="image-preview">
                            <img src={preview} alt="Preview" />
                            <button type="button" className="remove-btn" onClick={(e) => {
                                e.preventDefault(); // Prevent wrapper click
                                setFile(null);
                                setPreview(null);
                            }}>
                                ×
                            </button>
                        </div>
                    ) : (
                        <div>
                            <span className="upload-icon">📸</span>
                            <h3>Upload your style</h3>
                            <p>Tap to Browse or Drag Photo</p>
                        </div>
                    )}
                </label>

                <button type="submit" disabled={loading || !file} className="upload-submit">
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <div className="spinner" style={{ width: '20px', height: '20px', margin: 0, borderWidth: '2px' }}></div>
                            Analyzing your look...
                        </span>
                    ) : 'Start Stylist Analysis'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
