import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

export default function DetalleHospedaje({ lugar, evento, onVolver, onEditar }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showBuscar, setShowBuscar] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [ocupados, setOcupados] = useState(lugar.occupiedSpaces || 0);
  const { userData, canEdit } = useAuth();

  const disponibles = (lugar.capacity || 0) - ocupados;

  useEffect(() => {
    const q = query(collection(db, 'lodgingAssignments'), where('lodgingId', '==', lugar.id));
    const unsub = onSnapshot(q, (snap) => {
      setAsignaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [lugar.id]);

  useEffect(() => {
    if (!showBuscar) return;
    const q = query(
      collection(db, 'participants'),
      where('eventId', '==', evento.id),
      orderBy('registrationNumber', 'asc')
    );
    getDocs(q).then(snap => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [showBuscar, evento.id]);

  const asignarParticipante = async (participante) => {
    if (disponibles <= 0) {
      Swal.fire({ icon: 'warning', title: 'Sin espacio', text: 'Este lugar ya está lleno.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    const yaAsignado = asignaciones.find(a => a.participantId === participante.id);
    if (yaAsignado) {
      Swal.fire({ icon: 'warning', title: 'Ya asignado', text: 'Este participante ya está en este lugar.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setAsignando(true);
    try {
      await addDoc(collection(db, 'lodgingAssignments'), {
        lodgingId: lugar.id, lodgingName: lugar.name,
        participantId: participante.id, participantName: participante.fullName,
        registrationNumber: participante.registrationNumber,
        eventId: evento.id, assignedAt: serverTimestamp(), assignedBy: userData.uid
      });
      const nuevoOcupados = ocupados + 1;
      await updateDoc(doc(db, 'lodging', lugar.id), { occupiedSpaces: nuevoOcupados });
      setOcupados(nuevoOcupados);
      setBusqueda('');
      setShowBuscar(false);
      Swal.fire({ icon: 'success', title: 'Participante asignado', timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setAsignando(false);
    }
  };

  const removerAsignacion = async (asignacion) => {
    const result = await Swal.fire({
      title: '¿Remover asignación?', text: `¿Remover a "${asignacion.participantName}" de este lugar?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, remover',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'lodgingAssignments', asignacion.id));
        const nuevoOcupados = Math.max(ocupados - 1, 0);
        await updateDoc(doc(db, 'lodging', lugar.id), { occupiedSpaces: nuevoOcupados });
        setOcupados(nuevoOcupados);
        Swal.fire({ icon: 'success', title: 'Asignación removida', timer: 1200, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const participantesFiltrados = participantes.filter(p => {
    const texto = busqueda.toLowerCase();
    return !busqueda ||
      p.fullName?.toLowerCase().includes(texto) ||
      p.registrationNumber?.toString().includes(texto) ||
      p.church?.toLowerCase().includes(texto);
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{lugar.name}</h1>
          <p className="text-gray-500 text-sm">{lugar.type} — Capacidad: {lugar.capacity}</p>
        </div>
        {canEdit() && (
          <button onClick={onEditar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-800">{lugar.capacity}</p>
          <p className="text-gray-500 text-xs mt-1">Capacidad</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{ocupados}</p>
          <p className="text-gray-500 text-xs mt-1">Ocupados</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${disponibles <= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-2xl font-bold ${disponibles <= 0 ? 'text-red-600' : 'text-green-600'}`}>{disponibles}</p>
          <p className={`text-xs mt-1 ${disponibles <= 0 ? 'text-red-500' : 'text-green-500'}`}>Disponibles</p>
        </div>
      </div>

      {canEdit() && disponibles > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowBuscar(!showBuscar)}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Asignar Participante
          </button>
        </div>
      )}

      {disponibles <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
          <p className="text-red-600 font-semibold">⚠️ Este lugar está lleno</p>
        </div>
      )}

      {showBuscar && (
        <div className="bg-white rounded-xl border border-primary-200 p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Buscar participante para asignar:</p>
          <input type="text" placeholder="Nombre, número de registro, iglesia..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm mb-3"
            autoFocus />
          {busqueda && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {participantesFiltrados.slice(0, 10).map(p => {
                const yaAsignado = asignaciones.find(a => a.participantId === p.id);
                return (
                  <div key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${yaAsignado ? 'bg-gray-50 opacity-50' : 'hover:bg-primary-50 cursor-pointer'}`}
                    onClick={() => !yaAsignado && !asignando && asignarParticipante(p)}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.fullName}</p>
                      <p className="text-xs text-gray-400">#{p.registrationNumber} — {p.church}</p>
                    </div>
                    {yaAsignado
                      ? <span className="text-xs text-gray-400">Ya asignado</span>
                      : <span className="text-xs text-primary-600 font-medium">Asignar</span>}
                  </div>
                );
              })}
              {participantesFiltrados.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-2">No se encontraron participantes</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Participantes Asignados ({asignaciones.length})</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <svg className="animate-spin h-6 w-6 text-primary-800" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : asignaciones.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No hay participantes asignados todavía</p>
        ) : (
          <div className="space-y-2">
            {asignaciones.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{a.participantName}</p>
                  <p className="text-xs text-gray-400">Registro #{a.registrationNumber}</p>
                </div>
                {canEdit() && (
                  <button onClick={() => removerAsignacion(a)} className="text-red-400 hover:text-red-600 transition p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}