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
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            alert("¡Cuenta creada con éxito!");
            navigate('/login'); // Después de registrarse, lo mandamos a loguearse
        } catch (error) {
            alert("Error al registrar: " + (error.response?.data?.error || "Intenta con otro usuario"));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-t-8 border-brand-main">
                <h2 className="text-3xl font-bold text-brand-main text-center mb-2">Crear Cuenta</h2>
                <p className="text-gray-500 text-center mb-8">Únete a GlucosApp</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex gap-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-semibold text-brand-main">Nombre</label>
                            <input 
                                name="first_name"
                                type="text" 
                                className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-semibold text-brand-main">Apellido</label>
                            <input 
                                name="last_name"
                                type="text" 
                                className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-main">Usuario</label>
                        <input 
                            name="username"
                            type="text" 
                            className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-main">Contraseña</label>
                        <input 
                            name="password"
                            type="password" 
                            className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-brand-main text-white py-3 rounded-lg font-bold shadow-lg hover:bg-brand-accent transition-colors duration-300"
                    >
                        Registrarse
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-brand-main font-bold hover:underline">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;