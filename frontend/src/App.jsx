import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

// Componente para proteger rutas (Solo entras si estás logueado)
const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate replace to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas Privadas (Dashboard) */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-brand-main">Bienvenido al Dashboard</h1>
                <p>Aquí registraremos tu glucosa pronto...</p>
              </div>
            </PrivateRoute>
          } 
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;