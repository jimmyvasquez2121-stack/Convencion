import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import FormUsuario from '../components/FormUsuario';

const ROL_COLORS = {
  nacional:  'bg-primary-100 text-primary-800',
  regional:  'bg-blue-100 text-blue-700',
  distrital: 'bg-purple-100 text-purple-700',
  viewer:    'bg-gray-100 text-gray-600',
};

const ROL_LABELS = {
  nacional:  'Administrador Nacional',
  regional:  'Administrador Regional',
  distrital: 'Administrador Distrital',
  viewer:    'Visualizador',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const { userData } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleActivo = async (usuario) => {
    const nuevoEstado = !usuario.activo;
    const result = await Swal.fire({
      title: nuevoEstado ? '¿Activar usuario?' : '¿Desactivar usuario?',
      text: `${usuario.nombre || usuario.email}`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoEstado ? '#10b981' : '#dc2626',
      cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'users', usuario.id), { activo: nuevoEstado, updatedAt: serverTimestamp() });
        Swal.fire({ icon: 'success', title: nuevoEstado ? 'Usuario activado' : 'Usuario desactivado', timer: 1500, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const cambiarRol = async (usuario, nuevoRol) => {
    try {
      await updateDoc(doc(db, 'users', usuario.id), { rol: nuevoRol, updatedAt: serverTimestamp() });
      Swal.fire({ icon: 'success', title: 'Rol actualizado', timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  if (showForm) {
    return (
      <FormUsuario
        usuario={usuarioEditando}
        onCancelar={() => { setShowForm(false); setUsuarioEditando(null); }}
        onGuardado={() => { setShowForm(false); setUsuarioEditando(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de accesos al sistema</p>
        </div>
        <button onClick={() => { setUsuarioEditando(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <p className="font-semibold mb-1">ℹ️ ¿Cómo agregar un nuevo usuario?</p>
        <p>1. Crea el usuario en Firebase Console → Authentication → Users.</p>
        <p>2. Copia el User UID que aparece.</p>
        <p>3. Toca "Nuevo Usuario" aquí y pega el UID para asignarle un rol.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Correo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Región/Distrito</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold text-sm shrink-0">
                          {(u.nombre || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.nombre || '—'}</p>
                          <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.id === userData?.uid ? (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROL_COLORS[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                          {ROL_LABELS[u.rol] || u.rol}
                        </span>
                      ) : (
                        <select value={u.rol || ''} onChange={e => cambiarRol(u, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option value="nacional">Administrador Nacional</option>
                          <option value="regional">Administrador Regional</option>
                          <option value="distrital">Administrador Distrital</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {u.region && <p>Región: {u.region}</p>}
                      {u.distrito && <p>Distrito: {u.distrito}</p>}
                      {!u.region && !u.distrito && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setUsuarioEditando(u); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {u.id !== userData?.uid && (
                          <button onClick={() => toggleActivo(u)}
                            className={`p-1.5 rounded-lg transition ${u.activo !== false ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                            {u.activo !== false ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}