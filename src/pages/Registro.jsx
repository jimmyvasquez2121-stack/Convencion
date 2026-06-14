import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import Swal from 'sweetalert2';

export default function Registro() {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.password || !form.confirmar) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor completa todos los campos.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    if (form.password.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Contraseña muy corta', text: 'Mínimo 6 caracteres.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    if (form.password !== form.confirmar) {
      Swal.fire({ icon: 'warning', title: 'Las contraseñas no coinciden', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), {
        nombre: form.nombre.trim(), email: form.email.trim(),
        rol: 'viewer', region: null, distrito: null,
        activo: true, pendienteRol: true, createdAt: serverTimestamp()
      });
      await Swal.fire({
        icon: 'success', title: '¡Registro exitoso!',
        html: `Tu cuenta ha sido creada.<br><br><b>Importante:</b> El Administrador Nacional te asignará tu rol de acceso.`,
        confirmButtonColor: '#1e3a8a', confirmButtonText: 'Entendido'
      });
      navigate('/');
    } catch (error) {
      let mensaje = 'Ocurrió un error al crear la cuenta.';
      switch (error.code) {
        case 'auth/email-already-in-use': mensaje = 'Este correo ya está registrado.'; break;
        case 'auth/invalid-email': mensaje = 'El correo no es válido.'; break;
        case 'auth/weak-password': mensaje = 'La contraseña es muy débil.'; break;
        default: mensaje = error.message;
      }
      Swal.fire({ icon: 'error', title: 'Error al registrarse', text: mensaje, confirmButtonColor: '#1e3a8a' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-400 mb-4 shadow-lg">
            <svg className="w-10 h-10 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
          <p className="text-primary-200 mt-1 text-sm">Convención Nacional de Niños — Iglesia de Dios</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Registro de Usuario</h2>
          <p className="text-gray-400 text-xs text-center mb-6">
            El Administrador Nacional te asignará tu rol después del registro.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input type="text" name="nombre" value={form.nombre} onChange={cambiar}
                placeholder="Tu nombre completo"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" name="email" value={form.email} onChange={cambiar}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={cambiar}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input type={showPassword ? 'text' : 'password'} name="confirmar" value={form.confirmar} onChange={cambiar}
                placeholder="Repite tu contraseña"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary-800 hover:bg-primary-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando cuenta...
                </>
              ) : 'Crear cuenta'}
            </button>

            <div className="text-center">
              <button type="button" onClick={() => navigate('/login')}
                className="text-sm text-primary-700 hover:text-primary-900 font-medium transition">
                ¿Ya tienes cuenta? Inicia sesión
              </button>
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