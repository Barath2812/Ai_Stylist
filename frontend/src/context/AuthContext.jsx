import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');

            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
<<<<<<< HEAD
                const response = await api.get('/auth/verify');
=======
                const response = await axios.get('https://ai-stylist-6l22.onrender.com/api/auth/verify', {
                    headers: {
                        Authorization: `Bearer ${storedToken}`
                    }
                });
>>>>>>> 3239da67e6695471f4e2792b8c7beefc71a305cd

                if (response.data.success) {
                    setUser(response.data.user);
                    setToken(storedToken);
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                localStorage.removeItem('token');
                setToken(null);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = async (email, password) => {
<<<<<<< HEAD
        const response = await api.post('/auth/login', {
=======
        const response = await axios.post('https://ai-stylist-6l22.onrender.com/api/auth/login', {
>>>>>>> 3239da67e6695471f4e2792b8c7beefc71a305cd
            email,
            password
        });

        if (response.data.success) {
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return { success: true, message: response.data.message };
        }

        return { success: false, error: 'Login failed' };
    };

    const signup = async (name, email, password) => {
<<<<<<< HEAD
        const response = await api.post('/auth/signup', {
=======
        const response = await axios.post('https://ai-stylist-6l22.onrender.com/api/auth/signup', {
>>>>>>> 3239da67e6695471f4e2792b8c7beefc71a305cd
            name,
            email,
            password
        });

        if (response.data.success) {
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return { success: true, message: response.data.message };
        }

        return { success: false, error: 'Signup failed' };
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
