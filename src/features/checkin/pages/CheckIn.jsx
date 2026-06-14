import { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp, getDoc, getDocs
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

const PAYMENT_LABELS = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagado' };
const PAYMENT_COLORS = { pending: 'text-red-600', partial: 'text-yellow-600', paid: 'text-green-600' };

export default function CheckIn() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [participanteDetalle, setParticipanteDetalle] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  const { eventoActivo } = useEvent();
  const { userData } = useAuth();

  useEffect(() => {
    if (!eventoActivo) { setCheckins([]); setLoading(false); return; }
    const q = query(
      collection(db, 'checkins'),
      where('eventId', '==', eventoActivo.id),
      orderBy('checkedInAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  useEffect(() => {
    if (!busqueda || busqueda.length < 2 || !eventoActivo) { setResultados([]); return; }
    const timeout = setTimeout(async () => {
      setBuscando(true);
      try {
        const q = query(collection(db, 'participants'), where('eventId', '==', eventoActivo.id), orderBy('registrationNumber', 'asc'));
        const snap = await getDocs(q);
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const texto = busqueda.toLowerCase();
        const filtrados = todos.filter(p =>
          p.fullName?.toLowerCase().includes(texto) ||
          p.registrationNumber?.toString().includes(texto) ||
          p.church?.toLowerCase().includes(texto)
        ).slice(0, 8);
        setResultados(filtrados);
      } catch (error) {
        console.error(error);
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [busqueda, eventoActivo]);

  const procesarCheckin = async (participante) => {
    if (participante.checkedIn) {
      Swal.fire({ icon: 'info', title: 'Ya registrado', text: `${participante.fullName} ya hizo check-in anteriormente.`, confirmButtonColor: '#1e3a8a' });
      return;
    }
    setProcesando(true);
    try {
      await updateDoc(doc(db, 'participants', participante.id), {
        checkedIn: true, checkedInAt: serverTimestamp(), checkedInBy: userData.uid
      });
      await addDoc(collection(db, 'checkins'), {
        participantId: participante.id, participantName: participante.fullName,
        registrationNumber: participante.registrationNumber, participantType: participante.participantType,
        church: participante.church, district: participante.district,
        eventId: eventoActivo.id, checkedInAt: serverTimestamp(),
        checkedInBy: userData.uid, checkedInByName: userData.nombre || userData.email
      });
      setParticipanteDetalle({ ...participante, checkedIn: true });
      setBusqueda('');
      setResultados([]);
      Swal.fire({ icon: 'success', title: '✅ Check-In Exitoso', html: `<b>${participante.fullName}</b><br>Registro #${participante.registrationNumber}`, timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setProcesando(false);
    }
  };

  const procesarQR = async (qrText) => {
    try {
      const datos = JSON.parse(qrText);
      if (!datos.id) throw new Error('QR inválido');
      const participanteDoc = await getDoc(doc(db, 'participants', datos.id));
      if (!participanteDoc.exists()) {
        Swal.fire({ icon: 'error', title: 'No encontrado', text: 'El QR no corresponde a ningún participante.', confirmButtonColor: '#1e3a8a' });
        return;
      }
      const participante = { id: participanteDoc.id, ...participanteDoc.data() };
      if (participante.eventId !== eventoActivo.id) {
        Swal.fire({ icon: 'warning', title: 'Evento incorrecto', text: 'Esta credencial pertenece a otro evento.', confirmButtonColor: '#1e3a8a' });
        return;
      }
      setParticipanteDetalle(participante);
      await procesarCheckin(participante);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'QR inválido', text: 'No se pudo leer el código QR.', confirmButtonColor: '#1e3a8a' });
    }
  };

  const handleQrSubmit = (e) => {
    e.preventDefault();
    if (qrInput.trim()) { procesarQR(qrInput.trim()); setQrInput(''); }
  };

  const formatFecha = (timestamp) => {
    if (!timestamp) return '—';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const hoy = checkins.filter(c => {
    if (!c.checkedInAt) return false;
    const fecha = c.checkedInAt.toDate ? c.checkedInAt.toDate() : new Date(c.checkedInAt);
    return fecha.toDateString() === new Date().toDateString();
  });

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
        <h1 className="text-2xl font-bold text-gray-800">Check-In</h1>
        <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{checkins.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total Check-Ins</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-800">{hoy.length}</p>
          <p className="text-gray-500 text-xs mt-1">Hoy</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-yellow-500">{new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' })}</p>
          <p className="text-gray-500 text-xs mt-1">Fecha actual</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* QR */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m-6-4H4v4m0-10h.01M4 12h.01M12 8h.01M12 12h.01M12 16h.01M16 8h.01M16 12h2m-2 4h.01M4 4h6v6H4V4zm10 0h6v6h-6V4zm0 10h6v6h-6v-6zM4 14h6v6H4v-6z" />
              </svg>
              Escanear QR
            </h2>
            <p className="text-xs text-gray-400 mb-3">Usa un lector QR externo o la cámara. El resultado se pegará aquí automáticamente.</p>
            <form onSubmit={handleQrSubmit} className="flex gap-2">
              <input
                ref={qrInputRef}
                type="text" value={qrInput} onChange={e => setQrInput(e.target.value)}
                placeholder="Escanea o pega el código QR aquí..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm"
                autoComplete="off"
              />
              <button type="submit" disabled={!qrInput.trim() || procesando}
                className="bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50">
                ✓
              </button>
            </form>
          </div>

          {/* Búsqueda manual */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Búsqueda Manual
            </h2>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, número de registro o iglesia..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm" />

            {buscando && (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-5 w-5 text-primary-800" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {resultados.map(p => (
                  <div key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition cursor-pointer"
                    onClick={() => { setParticipanteDetalle(p); setBusqueda(''); setResultados([]); }}>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.fullName}</p>
                      <p className="text-xs text-gray-400">#{p.registrationNumber} — {p.church}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.checkedIn && <span className="text-xs text-green-600 font-semibold">✅</span>}
                      <span className="text-xs text-primary-600 font-medium">Ver</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalle */}
          {participanteDetalle && (
            <div className={`rounded-xl border p-5 ${participanteDetalle.checkedIn ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{participanteDetalle.fullName}</h3>
                  <p className="text-xs text-gray-400">#{participanteDetalle.registrationNumber} — {participanteDetalle.participantType}</p>
                </div>
                <button onClick={() => setParticipanteDetalle(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-400">Iglesia</span><span className="text-gray-700">{participanteDetalle.church}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Distrito</span><span className="text-gray-700">{participanteDetalle.district}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pago</span>
                  <span className={`font-semibold ${PAYMENT_COLORS[participanteDetalle.paymentStatus] || 'text-red-600'}`}>
                    {PAYMENT_LABELS[participanteDetalle.paymentStatus] || 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-In</span>
                  <span className={`font-semibold ${participanteDetalle.checkedIn ? 'text-green-600' : 'text-gray-400'}`}>
                    {participanteDetalle.checkedIn ? '✅ Ya registrado' : 'Pendiente'}
                  </span>
                </div>
              </div>
              {!participanteDetalle.checkedIn ? (
                <button onClick={() => procesarCheckin(participanteDetalle)} disabled={procesando}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {procesando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Procesando...
                    </>
                  ) : '✅ Confirmar Check-In'}
                </button>
              ) : (
                <div className="bg-green-100 rounded-lg p-3 text-center">
                  <p className="text-green-700 font-bold">✅ Check-In Completado</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historial */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Historial de Check-Ins ({checkins.length})</h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <svg className="animate-spin h-6 w-6 text-primary-800" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No hay check-ins registrados todavía</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {checkins.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{c.participantName}</p>
                    <p className="text-xs text-gray-400">#{c.registrationNumber} — {c.church}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-green-600">✅ {formatFecha(c.checkedInAt)}</p>
                    <p className="text-xs text-gray-400">{c.checkedInByName}</p>
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