import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import DetallePago from '../components/DetallePago';

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

export default function Pagos() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
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

  const filtrados = participantes.filter(p => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda ||
      p.fullName?.toLowerCase().includes(texto) ||
      p.registrationNumber?.toString().includes(texto) ||
      p.church?.toLowerCase().includes(texto);
    const coincideEstado = !filtroEstado || p.paymentStatus === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const totalCuota = eventoActivo?.registrationFee || 0;
  const totalEsperado = participantes.length * totalCuota;
  const totalRecaudado = participantes.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalPendiente = totalEsperado - totalRecaudado;
  const pagados = participantes.filter(p => p.paymentStatus === 'paid').length;
  const parciales = participantes.filter(p => p.paymentStatus === 'partial').length;
  const pendientes = participantes.filter(p => p.paymentStatus === 'pending').length;

  if (participanteSeleccionado) {
    return (
      <DetallePago
        participante={participanteSeleccionado}
        evento={eventoActivo}
        onVolver={() => setParticipanteSeleccionado(null)}
      />
    );
  }

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pagos</h1>
        <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-green-600">${totalRecaudado.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Pendiente</p>
          <p className="text-2xl font-bold text-red-600">${totalPendiente.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Esperado</p>
          <p className="text-2xl font-bold text-gray-800">${totalEsperado.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Cuota por persona</p>
          <p className="text-2xl font-bold text-primary-800">${totalCuota.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{pagados}</p>
          <p className="text-green-700 text-xs font-medium mt-1">Pagados</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{parciales}</p>
          <p className="text-yellow-700 text-xs font-medium mt-1">Parciales</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{pendientes}</p>
          <p className="text-red-700 text-xs font-medium mt-1">Pendientes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, número, iglesia..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pagado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-gray-500 font-medium">No se encontraron participantes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Iglesia</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pagado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Saldo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(p => {
                  const saldo = totalCuota - (p.amountPaid || 0);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.registrationNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.fullName}</p>
                        <p className="text-xs text-gray-400">{p.participantType}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.church}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">${(p.amountPaid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-red-600 hidden sm:table-cell">${saldo > 0 ? saldo.toLocaleString() : '0'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAYMENT_COLORS[p.paymentStatus] || PAYMENT_COLORS.pending}`}>
                          {PAYMENT_LABELS[p.paymentStatus] || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setParticipanteSeleccionado(p)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-9c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}