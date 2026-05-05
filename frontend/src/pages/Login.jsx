import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authStore';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(credentials.username, credentials.password);
            // Al tener éxito, nos movemos al Dashboard
            navigate('/dashboard');
        } catch (requestError) {
            setError(requestError.response?.data?.error || "Usuario o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8 border-t-8 border-brand-main">
                <h2 className="text-3xl font-black text-brand-main text-center mb-2">Iniciar Sesión</h2>
                <p className="text-gray-500 text-center mb-8">Monitorea tu salud con GlucosApp</p>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="login_username" className="block text-sm font-semibold text-brand-main">Usuario</label>
                        <input
                            id="login_username"
                            name="username"
                            type="text"
                            className="w-full min-h-12 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="login_password" className="block text-sm font-semibold text-brand-main">Contraseña</label>
                        <input
                            id="login_password"
                            name="password"
                            type="password"
                            className="w-full min-h-12 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full min-h-12 bg-brand-main text-white py-3 rounded-lg font-bold shadow-lg hover:bg-brand-accent transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-brand-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="text-brand-main font-bold hover:underline focus:outline-none focus:ring-4 focus:ring-brand-accent/25 rounded-lg">
                        Regístrate gratis
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
