import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import FormParticipante from '../components/FormParticipante';
import DetalleParticipante from '../components/DetalleParticipante';

const TIPO_COLORS = {
  'Niño':           'bg-blue-100 text-blue-700',
  'Maestro':        'bg-purple-100 text-purple-700',
  'Líder de Niños': 'bg-green-100 text-green-700',
  'Pastor':         'bg-yellow-100 text-yellow-700',
  'Padre/Madre':    'bg-orange-100 text-orange-700',
  'Voluntario':     'bg-pink-100 text-pink-700',
  'Invitado':       'bg-gray-100 text-gray-700',
};

const PAYMENT_COLORS = {
  pending: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid:    'bg-green-100 text-green-700',
};

const PAYMENT_LABELS = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid:    'Pagado',
};

export default function Participantes() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroPago, setFiltroPago] = useState('');
  const [vista, setVista] = useState('lista');
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null);

  const { eventoActivo } = useEvent();
  const { canEdit } = useAuth();

  useEffect(() => {
    if (!eventoActivo) {
      setParticipantes([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'participants'),
      where('eventId', '==', eventoActivo.id),
      orderBy('registrationNumber', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  const participantesFiltrados = participantes.filter(p => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda ||
      p.fullName?.toLowerCase().includes(texto) ||
      p.registrationNumber?.toString().includes(texto) ||
      p.church?.toLowerCase().includes(texto) ||
      p.district?.toLowerCase().includes(texto);
    const coincideTipo = !filtroTipo || p.participantType === filtroTipo;
    const coincidePago = !filtroPago || p.paymentStatus === filtroPago;
    return coincideTexto && coincideTipo && coincidePago;
  });

  const eliminarParticipante = async (participante) => {
    const result = await Swal.fire({
      title: '¿Eliminar participante?',
      text: `¿Estás seguro que deseas eliminar a "${participante.fullName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'participants', participante.id));
        Swal.fire({ icon: 'success', title: 'Participante eliminado', timer: 1500, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
        <p className="text-gray-400 text-sm mt-1">Selecciona un evento para ver sus participantes</p>
      </div>
    );
  }

  if (vista === 'form') {
    return (
      <FormParticipante
        participante={participanteSeleccionado}
        evento={eventoActivo}
        totalParticipantes={participantes.length}
        onCancelar={() => { setVista('lista'); setParticipanteSeleccionado(null); }}
        onGuardado={() => { setVista('lista'); setParticipanteSeleccionado(null); }}
      />
    );
  }

  if (vista === 'detalle') {
    return (
      <DetalleParticipante
        participante={participanteSeleccionado}
        onVolver={() => { setVista('lista'); setParticipanteSeleccionado(null); }}
        onEditar={() => setVista('form')}
        onEliminar={() => { eliminarParticipante(participanteSeleccionado); setVista('lista'); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Participantes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {eventoActivo.name} — {participantes.length} registrados
          </p>
        </div>
        {canEdit() && (
          <button
            onClick={() => { setParticipanteSeleccionado(null); setVista('form'); }}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Participante
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, número, iglesia, distrito..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm"
        />
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="Niño">Niño</option>
          <option value="Maestro">Maestro</option>
          <option value="Líder de Niños">Líder de Niños</option>
          <option value="Pastor">Pastor</option>
          <option value="Padre/Madre">Padre/Madre</option>
          <option value="Voluntario">Voluntario</option>
          <option value="Invitado">Invitado</option>
        </select>
        <select
          value={filtroPago}
          onChange={e => setFiltroPago(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
        >
          <option value="">Todos los pagos</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pagado</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: participantes.length, color: 'text-primary-800' },
          { label: 'Niños', value: participantes.filter(p => p.participantType === 'Niño').length, color: 'text-blue-600' },
          { label: 'Pagados', value: participantes.filter(p => p.paymentStatus === 'paid').length, color: 'text-green-600' },
          { label: 'Pendientes', value: participantes.filter(p => p.paymentStatus === 'pending').length, color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : participantesFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-500 font-medium">
            {participantes.length === 0 ? 'No hay participantes registrados' : 'No se encontraron resultados'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {participantes.length === 0 ? 'Toca "Nuevo Participante" para registrar el primero' : 'Intenta con otros filtros'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Iglesia</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Distrito</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pago</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participantesFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.registrationNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.fullName}</p>
                      <p className="text-xs text-gray-400">{p.age ? `${p.age} años` : ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIPO_COLORS[p.participantType] || 'bg-gray-100 text-gray-700'}`}>
                        {p.participantType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.church}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.district}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAYMENT_COLORS[p.paymentStatus] || PAYMENT_COLORS.pending}`}>
                        {PAYMENT_LABELS[p.paymentStatus] || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setParticipanteSeleccionado(p); setVista('detalle'); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {canEdit() && (
                          <button
                            onClick={() => { setParticipanteSeleccionado(p); setVista('form'); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canEdit() && (
                          <button
                            onClick={() => eliminarParticipante(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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