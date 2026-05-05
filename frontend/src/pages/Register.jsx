import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/register', formData);
            navigate('/login'); // Después de registrarse, lo mandamos a loguearse
        } catch (requestError) {
            setError(requestError.response?.data?.error || "No se pudo crear la cuenta. Intentá con otro usuario.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8 border-t-8 border-brand-main">
                <h2 className="text-3xl font-black text-brand-main text-center mb-2">Crear Cuenta</h2>
                <p className="text-gray-500 text-center mb-8">Únete a GlucosApp</p>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-800">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="register_first_name" className="block text-sm font-semibold text-brand-main">Nombre</label>
                            <input 
                                id="register_first_name"
                                name="first_name"
                                type="text" 
                                className="w-full min-h-12 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="register_last_name" className="block text-sm font-semibold text-brand-main">Apellido</label>
                            <input 
                                id="register_last_name"
                                name="last_name"
                                type="text" 
                                className="w-full min-h-12 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="register_username" className="block text-sm font-semibold text-brand-main">Usuario</label>
                        <input 
                            id="register_username"
                            name="username"
                            type="text" 
                            className="w-full min-h-12 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="register_password" className="block text-sm font-semibold text-brand-main">Contraseña</label>
                        <input 
                            id="register_password"
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
                        {loading ? 'Creando cuenta...' : 'Registrarse'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-brand-main font-bold hover:underline focus:outline-none focus:ring-4 focus:ring-brand-accent/25 rounded-lg">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
