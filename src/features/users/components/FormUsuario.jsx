import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

export default function FormUsuario({ usuario, onCancelar, onGuardado }) {
  const [form, setForm] = useState({
    uid: '', nombre: '', email: '', rol: 'viewer',
    region: '', distrito: '', activo: true,
  });
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (usuario) {
      setForm({
        uid: usuario.id || '',
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        rol: usuario.rol || 'viewer',
        region: usuario.region || '',
        distrito: usuario.distrito || '',
        activo: usuario.activo !== false,
      });
    }
  }, [usuario]);

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!usuario && !form.uid.trim()) nuevosErrores.uid = 'El UID es obligatorio';
    if (!form.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (!form.email.trim()) nuevosErrores.email = 'El correo es obligatorio';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const datos = {
        nombre: form.nombre.trim(), email: form.email.trim(),
        rol: form.rol, region: form.region.trim() || null,
        distrito: form.distrito.trim() || null, activo: form.activo,
        updatedAt: serverTimestamp(),
      };
      if (usuario) {
        await updateDoc(doc(db, 'users', usuario.id), datos);
      } else {
        await setDoc(doc(db, 'users', form.uid.trim()), { ...datos, createdAt: serverTimestamp() });
      }
      Swal.fire({ icon: 'success', title: usuario ? 'Usuario actualizado' : 'Usuario creado', timer: 1500, showConfirmButton: false });
      onGuardado();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const necesitaRegion = form.rol === 'regional' || form.rol === 'distrital';
  const necesitaDistrito = form.rol === 'distrital';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
          <p className="text-gray-500 text-sm">Completa los datos del usuario</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!usuario && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UID de Firebase <span className="text-red-500">*</span>
              </label>
              <input type="text" name="uid" value={form.uid} onChange={cambiar}
                placeholder="Pega aquí el UID de Firebase Authentication"
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.uid ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition text-sm`} />
              {errores.uid && <p className="text-red-500 text-xs mt-1">{errores.uid}</p>}
              <p className="text-xs text-gray-400 mt-1">Firebase Console → Authentication → Users → User UID</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input type="text" name="nombre" value={form.nombre} onChange={cambiar}
              placeholder="Nombre del usuario"
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.nombre ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
            {errores.nombre && <p className="text-red-500 text-xs mt-1">{errores.nombre}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={cambiar}
              placeholder="correo@ejemplo.com"
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.email ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
            {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select name="rol" value={form.rol} onChange={cambiar}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
              <option value="nacional">Administrador Nacional</option>
              <option value="regional">Administrador Regional</option>
              <option value="distrital">Administrador Distrital</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>

          {necesitaRegion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región asignada</label>
              <input type="text" name="region" value={form.region} onChange={cambiar}
                placeholder="Nombre de la región"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          )}

          {necesitaDistrito && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distrito asignado</label>
              <input type="text" name="distrito" value={form.distrito} onChange={cambiar}
                placeholder="Nombre del distrito"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" name="activo" id="activo" checked={form.activo} onChange={cambiar}
              className="w-4 h-4 text-primary-800 rounded" />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">Usuario activo</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando}
              className="flex-1 bg-primary-800 hover:bg-primary-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (usuario ? 'Guardar cambios' : 'Crear usuario')}
            </button>
            <button type="button" onClick={onCancelar}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}