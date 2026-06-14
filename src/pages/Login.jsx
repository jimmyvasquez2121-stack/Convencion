import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor ingresa tu correo y contraseña.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      let mensaje = 'Ocurrió un error al iniciar sesión.';
      switch (error.code) {
        case 'auth/invalid-email': mensaje = 'El correo electrónico no es válido.'; break;
        case 'auth/user-not-found':
        case 'auth/invalid-credential': mensaje = 'Correo o contraseña incorrectos.'; break;
        case 'auth/wrong-password': mensaje = 'Correo o contraseña incorrectos.'; break;
        case 'auth/too-many-requests': mensaje = 'Demasiados intentos fallidos. Intenta más tarde.'; break;
        case 'auth/user-disabled': mensaje = 'Esta cuenta ha sido deshabilitada.'; break;
        default: mensaje = 'Error: ' + error.message;
      }
      Swal.fire({ icon: 'error', title: 'Error al iniciar sesión', text: mensaje, confirmButtonColor: '#1e3a8a' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white mb-4 shadow-lg overflow-hidden">
           <img src="../IMG-20260104-WA0006.jpg" alt="Logo DIN" className="w-full h-full object-cover" />
        </div>
          <h1 className="text-2xl font-bold text-white">Convención Nacional de Niños</h1>
          <p className="text-primary-200 mt-1 text-sm">Iglesia de Dios — Ministerio Nacional de Niños</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com" autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary-800 hover:bg-primary-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>

            <div className="text-center pt-2">
              <Link to="/registro" className="text-sm text-primary-700 hover:text-primary-900 font-medium transition">
                ¿No tienes cuenta? Regístrate aquí
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          © {new Date().getFullYear()} Ministerio Nacional de Niños — Iglesia de Dios
        </p>
      </div>
    </div>
  );
}