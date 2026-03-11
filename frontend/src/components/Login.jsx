import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Animated Background */}
            <div className="auth-bg-effects">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
                <div className="bg-grid"></div>
            </div>

            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-icon">✨</span>
                    <span className="brand-name">AI Stylist</span>
                </div>

                <div className="auth-header">
                    <h1>Welcome Back</h1>
                    <p>Login to continue your style journey</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                minLength="6"
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner-small"></span>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <span className="btn-arrow">→</span>
                            </>
                        )}
                    </button>

                    <div className="auth-footer">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/signup" className="auth-link">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
