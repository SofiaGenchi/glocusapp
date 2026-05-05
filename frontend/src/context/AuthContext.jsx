import { useEffect, useState } from 'react';
import api from '../api/axios';
import { AuthContext } from './authStore';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Aquí guardaremos los datos del usuario
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get('/auth/me');
                setUser(data.user);
            } catch {
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    // Función para iniciar sesión
    const login = async (username, password) => {
        // Hacemos la petición al backend que ya probamos en Postman
        const { data } = await api.post('/auth/login', { username, password });
        
        // Guardamos el token en el navegador para que no se pierda al recargar
        localStorage.setItem('token', data.token);
        
        // Guardamos los datos del usuario en el estado de React
        setUser(data.user);
    };

    // Función para cerrar sesión
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
