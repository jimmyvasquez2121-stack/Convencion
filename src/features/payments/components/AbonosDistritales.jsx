import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { useEvent } from '../../../context/EventContext';
import Swal from 'sweetalert2';

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'];

export default function AbonosDistritales() {
  const [abonos, setAbonos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { userData, isNacional, isDistrital } = useAuth();
  const { eventoActivo } = useEvent();

  useEffect(() => {
    if (!eventoActivo) { setAbonos([]); setLoading(false); return; }

    let q;
    if (isNacional()) {
      q = query(
        collection(db, 'abonosDistritales'),
        where('eventId', '==', eventoActivo.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'abonosDistritales'),
        where('eventId', '==', eventoActivo.id),
        where('distrito', '==', userData.distrito),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setAbonos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo, userData]);

  const registrarAbono = async (e) => {
    e.preventDefault();
    const montoNum = Number(monto);
    if (!monto || montoNum <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto mayor a 0.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setGuardando(true);
    try {
      await addDoc(collection(db, 'abonosDistritales'), {
        eventId: eventoActivo.id,
        eventName: eventoActivo.name,
        distrito: userData.distrito,
        amount: montoNum,
        method: metodo,
        note: nota.trim(),
        createdAt: serverTimestamp(),
        createdBy: userData.uid,
        createdByName: userData.nombre || userData.email
      });
      Swal.fire({ icon: 'success', title: '¡Abono registrado!', timer: 1500, showConfirmButton: false });
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

  // Agrupar por distrito para el nacional
  const porDistrito = abonos.reduce((acc, a) => {
    const d = a.distrito || 'Sin distrito';
    if (!acc[d]) acc[d] = { total: 0, abonos: [] };
    acc[d].total += a.amount || 0;
    acc[d].abonos.push(a);
    return acc;
  }, {});

  const totalGeneral = abonos.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Abonos Distritales</h2>
          <p className="text-gray-500 text-sm">{eventoActivo?.name}</p>
        </div>
        {isDistrital() && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Abono
          </button>
        )}
      </div>

      {/* Total general para nacional */}
      {isNacional() && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Total Recibido de Distritos</p>
          <p className="text-3xl font-bold text-green-700">${totalGeneral.toLocaleString()}</p>
        </div>
      )}

      {/* Formulario de abono */}
      {showForm && isDistrital() && (
        <div className="bg-white rounded-xl border border-primary-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-700 mb-4">Registrar Abono a la Nacional</h3>
          <form onSubmit={registrarAbono} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0" min="1"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
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
                ) : 'Guardar abono'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de abonos */}
      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : abonos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No hay abonos registrados todavía</p>
        </div>
      ) : isNacional() ? (
        // Vista nacional: agrupado por distrito
        <div className="space-y-4">
          {Object.entries(porDistrito).map(([distrito, datos]) => (
            <div key={distrito} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">{distrito}</h3>
                <span className="text-green-600 font-bold">${datos.total.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {datos.abonos.map(abono => (
                  <div key={abono.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-semibold text-green-600">${abono.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{abono.method} — {formatFecha(abono.createdAt)}</p>
                      {abono.note && <p className="text-xs text-gray-400">{abono.note}</p>}
                    </div>
                    <p className="text-xs text-gray-400">{abono.createdByName}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vista distrital: sus propios abonos
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-200">
            <h3 className="font-semibold text-gray-700">Mis abonos enviados</h3>
            <span className="text-green-600 font-bold">${abonos.reduce((s, a) => s + (a.amount || 0), 0).toLocaleString()}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {abonos.map(abono => (
              <div key={abono.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-semibold text-green-600">${abono.amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{abono.method} — {formatFecha(abono.createdAt)}</p>
                  {abono.note && <p className="text-xs text-gray-400">{abono.note}</p>}
                </div>
                <p className="text-xs text-gray-400">{abono.createdByName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}