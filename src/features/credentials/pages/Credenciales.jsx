import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import DetalleCredencial from '../components/DetalleCredencial';
import { QRCodeSVG } from 'qrcode.react';

const TIPO_COLORS = {
  'Niño':           'bg-blue-100 text-blue-700',
  'Maestro':        'bg-purple-100 text-purple-700',
  'Líder de Niños': 'bg-green-100 text-green-700',
  'Pastor':         'bg-yellow-100 text-yellow-700',
  'Padre/Madre':    'bg-orange-100 text-orange-700',
  'Voluntario':     'bg-pink-100 text-pink-700',
  'Invitado':       'bg-gray-100 text-gray-700',
};

export default function Credenciales() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null);
  const { eventoActivo } = useEvent();

  useEffect(() => {
    if (!eventoActivo) { setParticipantes([]); setLoading(false); return; }
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
    const coincideTipo = !filtroTipo || p.participantType === filtroTipo;
    return coincideTexto && coincideTipo;
  });

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
      </div>
    );
  }

  if (participanteSeleccionado) {
    return (
      <DetalleCredencial
        participante={participanteSeleccionado}
        evento={eventoActivo}
        onVolver={() => setParticipanteSeleccionado(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Credenciales</h1>
          <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name} — {participantes.length} participantes</p>
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
          <div className="text-5xl mb-4">🪪</div>
          <p className="text-gray-500 font-medium">No se encontraron participantes</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(p => (
            <div key={p.id}
              onClick={() => setParticipanteSeleccionado(p)}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition cursor-pointer">
              <div className="shrink-0 bg-white p-1 border border-gray-200 rounded-lg">
                <QRCodeSVG
                  value={JSON.stringify({ id: p.id, reg: p.registrationNumber, name: p.fullName, event: eventoActivo.id })}
                  size={48}
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{p.fullName}</p>
                <p className="text-xs text-gray-400">#{p.registrationNumber}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${TIPO_COLORS[p.participantType] || 'bg-gray-100 text-gray-700'}`}>
                  {p.participantType}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}