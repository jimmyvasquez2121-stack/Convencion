import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, doc,
  query, where, onSnapshot, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'];

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

export default function DetallePago({ participante, evento, onVolver }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [montoActual, setMontoActual] = useState(participante?.amountPaid || 0);
  const [estadoActual, setEstadoActual] = useState(participante?.paymentStatus || 'pending');
  const { userData, canEdit } = useAuth();

  const cuota = evento?.registrationFee || 0;
  const saldo = cuota - montoActual;

  useEffect(() => {
    const q = query(
      collection(db, 'payments'),
      where('participantId', '==', participante.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [participante.id]);

  const registrarPago = async (e) => {
    e.preventDefault();
    const montoNum = Number(monto);

    if (!monto || montoNum <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto mayor a 0.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    if (montoNum > saldo) {
      Swal.fire({ icon: 'warning', title: 'Monto excede el saldo', text: `El saldo pendiente es $${saldo.toLocaleString()}.`, confirmButtonColor: '#1e3a8a' });
      return;
    }

    setGuardando(true);
    try {
      await addDoc(collection(db, 'payments'), {
        participantId: participante.id,
        participantName: participante.fullName,
        eventId: evento.id,
        eventName: evento.name,
        amount: montoNum,
        method: metodo,
        note: nota.trim(),
        createdAt: serverTimestamp(),
        createdBy: userData.uid,
        createdByName: userData.nombre || userData.email
      });

      const nuevoTotal = montoActual + montoNum;
      const nuevoEstado = nuevoTotal >= cuota ? 'paid' : nuevoTotal > 0 ? 'partial' : 'pending';

      await updateDoc(doc(db, 'participants', participante.id), {
        amountPaid: nuevoTotal,
        paymentStatus: nuevoEstado,
        updatedAt: serverTimestamp(),
        updatedBy: userData.uid
      });

      setMontoActual(nuevoTotal);
      setEstadoActual(nuevoEstado);

      Swal.fire({
        icon: 'success',
        title: '¡Pago registrado!',
        text: nuevoEstado === 'paid' ? '✅ El participante está al día.' : `Saldo restante: $${(cuota - nuevoTotal).toLocaleString()}`,
        confirmButtonColor: '#1e3a8a'
      });

      setMonto('');
      setNota('');
      setShowForm(false);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const formatFecha = (timestamp) => {
    if (!timestamp) return '—';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{participante.fullName}</h1>
          <p className="text-gray-500 text-sm">Registro #{participante.registrationNumber} — {participante.church}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Resumen de Pago</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Cuota total</span>
              <span className="font-semibold text-gray-800">${cuota.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Total pagado</span>
              <span className="font-semibold text-green-600">${montoActual.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Saldo pendiente</span>
              <span className="font-semibold text-red-600">${saldo > 0 ? saldo.toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Estado</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PAYMENT_COLORS[estadoActual] || PAYMENT_COLORS.pending}`}>
                {PAYMENT_LABELS[estadoActual] || 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progreso de pago</span>
              <span>{cuota > 0 ? Math.min(Math.round((montoActual / cuota) * 100), 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all"
                style={{ width: `${cuota > 0 ? Math.min((montoActual / cuota) * 100, 100) : 0}%` }}
              />
            </div>
          </div>

          {canEdit() && saldo > 0 && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full mt-4 bg-primary-800 hover:bg-primary-900 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Pago
            </button>
          )}

          {estadoActual === 'paid' && (
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-green-700 font-semibold text-sm">✅ Pago completo</p>
            </div>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-primary-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Registrar Nuevo Pago</h2>
            <form onSubmit={registrarPago} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number" value={monto} onChange={e => setMonto(e.target.value)}
                    placeholder="0" min="1" max={saldo}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Máximo: ${saldo.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select value={metodo} onChange={e => setMetodo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
                  {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input type="text" value={nota} onChange={e => setNota(e.target.value)}
                  placeholder="Referencia, observación..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-primary-800 hover:bg-primary-900 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {guardando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </>
                  ) : 'Guardar pago'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={`bg-white rounded-xl border border-gray-200 p-5 ${!showForm ? 'lg:col-span-2' : ''}`}>
          <h2 className="font-semibold text-gray-700 mb-4">Historial de Pagos</h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <svg className="animate-spin h-6 w-6 text-primary-800" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No hay pagos registrados todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagos.map(pago => (
                <div key={pago.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-green-600">${pago.amount?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{pago.method} — {formatFecha(pago.createdAt)}</p>
                    {pago.note && <p className="text-xs text-gray-400 mt-0.5">{pago.note}</p>}
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    <p>{pago.createdByName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}