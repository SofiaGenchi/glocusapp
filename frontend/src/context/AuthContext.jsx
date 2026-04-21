import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Creamos el contexto
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Aquí guardaremos los datos del usuario

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
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};