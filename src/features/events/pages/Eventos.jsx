import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import FormEvento from '../components/FormEvento';

const STATUS_INFO = {
  Draft:     { label: 'Borrador',   color: 'bg-gray-100 text-gray-700' },
  Open:      { label: 'Abierto',    color: 'bg-green-100 text-green-700' },
  Closed:    { label: 'Cerrado',    color: 'bg-red-100 text-red-700' },
  Completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
};

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const { userData } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const abrirFormNuevo = () => {
    setEventoEditando(null);
    setShowForm(true);
  };

  const abrirFormEditar = (evento) => {
    setEventoEditando(evento);
    setShowForm(true);
  };

  const guardarEvento = async (datos) => {
    try {
      if (eventoEditando) {
        await updateDoc(doc(db, 'events', eventoEditando.id), {
          ...datos,
          updatedAt: serverTimestamp(),
          updatedBy: userData.uid
        });
        Swal.fire({ icon: 'success', title: 'Evento actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await addDoc(collection(db, 'events'), {
          ...datos,
          createdAt: serverTimestamp(),
          createdBy: userData.uid
        });
        Swal.fire({ icon: 'success', title: 'Evento creado', timer: 1500, showConfirmButton: false });
      }
      setShowForm(false);
      setEventoEditando(null);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  const eliminarEvento = async (evento) => {
    const result = await Swal.fire({
      title: '¿Eliminar evento?',
      text: `¿Estás seguro que deseas eliminar "${evento.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'events', evento.id));
        Swal.fire({ icon: 'success', title: 'Evento eliminado', timer: 1500, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const cambiarEstado = async (evento, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'events', evento.id), {
        status: nuevoEstado,
        updatedAt: serverTimestamp(),
        updatedBy: userData.uid
      });
      Swal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  if (showForm) {
    return (
      <FormEvento
        evento={eventoEditando}
        onGuardar={guardarEvento}
        onCancelar={() => { setShowForm(false); setEventoEditando(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Eventos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona las convenciones y eventos del ministerio</p>
        </div>
        <button
          onClick={abrirFormNuevo}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Evento
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : eventos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-gray-500 font-medium">No hay eventos creados todavía</p>
          <p className="text-gray-400 text-sm mt-1">Toca "Nuevo Evento" para crear el primero</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => {
            const info = STATUS_INFO[evento.status] || STATUS_INFO.Draft;
            return (
              <div key={evento.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.color}`}>
                    {info.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {evento.startDate ? new Date(evento.startDate).toLocaleDateString('es') : '—'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg leading-tight">{evento.name}</h3>
                  {evento.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{evento.description}</p>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {evento.location && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {evento.location}
                    </div>
                  )}
                  {evento.registrationFee ? (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-9c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cuota: ${Number(evento.registrationFee).toLocaleString()}
                    </div>
                  ) : null}
                  {evento.maxCapacity ? (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-7.13a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Capacidad: {Number(evento.maxCapacity).toLocaleString()}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <select
                    value={evento.status}
                    onChange={(e) => cambiarEstado(evento, e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none"
                  >
                    <option value="Draft">Borrador</option>
                    <option value="Open">Abierto</option>
                    <option value="Closed">Cerrado</option>
                    <option value="Completed">Completado</option>
                  </select>
                  <button
                    onClick={() => abrirFormEditar(evento)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarEvento(evento)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}