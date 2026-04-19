import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial check: is user authenticated from Django context?
        const isAuth = window.DjangoContext?.isAuthenticated || false;
        setIsAuthenticated(isAuth);
        
        if (isAuth && window.DjangoContext?.user) {
            setUser(window.DjangoContext.user);
        }
        
        setLoading(false);
    }, []);

    const logout = async () => {
        setLoading(true);
        try {
            // Clear React-side tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            
            // Redirect to Django logout view which handles session clearing
            window.location.href = '/users/logout/';
        } catch (error) {
            console.error('Logout failed:', error);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
