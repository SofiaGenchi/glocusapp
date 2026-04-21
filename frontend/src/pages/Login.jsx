import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(credentials.username, credentials.password);
            // Al tener éxito, nos movemos al Dashboard
            navigate('/dashboard');
        } catch (error) {
            alert("Error al entrar: Usuario o contraseña incorrectos");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-t-8 border-brand-main">
                <h2 className="text-3xl font-bold text-brand-main text-center mb-2">Iniciar Sesión</h2>
                <p className="text-gray-500 text-center mb-8">Monitorea tu salud con Cemendi</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-brand-main">Usuario</label>
                        <input 
                            name="username"
                            type="text" 
                            className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-main">Contraseña</label>
                        <input 
                            name="password"
                            type="password" 
                            className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-brand-main text-white py-3 rounded-lg font-bold shadow-lg hover:bg-brand-accent transition-all duration-300 transform hover:scale-[1.02]"
                    >
                        Entrar
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="text-brand-main font-bold hover:underline">
                        Regístrate gratis
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;