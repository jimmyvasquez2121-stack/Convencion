import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
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
  'Staff':          'bg-blue-100 text-blue-700',
};

export default function Credenciales() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null);
  const { eventoActivo } = useEvent();
  const { isNacional, isAdminNacional, userData } = useAuth();

  useEffect(() => {
    if (!eventoActivo) { setParticipantes([]); setLoading(false); return; }
    
    let q;
    if (isAdminNacional()) {
      q = query(
        collection(db, 'participants'),
        where('eventId', '==', eventoActivo.id),
        orderBy('registrationNumber', 'asc')
      );
    } else {
      q = query(
        collection(db, 'participants'),
        where('eventId', '==', eventoActivo.id),
        where('district', '==', userData.distrito),
        orderBy('registrationNumber', 'asc')
      );
    }
    
    const unsub = onSnapshot(q, (snap) => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo, userData]);

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

  const imprimirTodas = () => {
    const credencialesHTML = filtrados.map(p => {
      const colores = {
        'Niño':           { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
        'Maestro':        { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
        'Líder de Niños': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
        'Pastor':         { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
        'Padre/Madre':    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
        'Voluntario':     { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
        'Staff':          { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
        'Invitado':       { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
      };
      const color = colores[p.participantType] || colores['Invitado'];
      return `
        <div class="credencial">
          <div class="header">
            <div class="evento">${eventoActivo.name}</div>
            <div class="subtitulo">Iglesia de Dios</div>
            <div class="tipo-badge" style="background:${color.bg};color:${color.text};border:1px solid ${color.border}">${p.participantType}</div>
          </div>
          <div class="body">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(JSON.stringify({id:p.id,reg:p.registrationNumber,name:p.fullName,event:eventoActivo.id}))}" 
              width="90" height="90" style="border-radius:4px;margin:0 auto 4px;display:block;" />
            <div class="nombre">${p.fullName}</div>
            <div class="reg">Registro #${p.registrationNumber}</div>
            ${p.church ? `<div class="info">${p.church}</div>` : ''}
            ${p.district ? `<div class="info distrito">${p.district}</div>` : ''}
          </div>
          <div class="footer">Credencial válida únicamente para este evento</div>
        </div>
      `;
    }).join('');

    const contenido = `
      <html>
      <head>
        <title>Credenciales - ${eventoActivo.name}</title>
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; background: white; }
          .contenedor { display: flex; flex-wrap: wrap; gap: 5mm; justify-content: flex-start; }
          .credencial { width: 54mm; height: 85mm; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; page-break-inside: avoid; }
          .header { background: #1e3a8a !important; color: white; padding: 6px 8px; text-align: center; }
          .evento { font-size: 7px; font-weight: bold; line-height: 1.2; }
          .subtitulo { font-size: 5.5px; opacity: 0.8; margin-top: 2px; }
          .tipo-badge { margin: 3px auto 0; display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 6px; font-weight: bold; }
          .body { flex: 1; padding: 5px 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .qr-placeholder { width: 75px; height: 75px; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 6px; color: #9ca3af; margin: 0 auto 4px; }
          .nombre { font-size: 8px; font-weight: bold; color: #1f2937; margin: 2px 0 1px; line-height: 1.2; }
          .reg { font-size: 6px; color: #6b7280; margin-bottom: 1px; }
          .info { font-size: 6px; color: #374151; }
          .distrito { color: #6b7280; }
          .footer { background: #f9fafb !important; border-top: 1px solid #e5e7eb; padding: 3px; text-align: center; font-size: 5px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="contenedor">
          ${credencialesHTML}
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.print();
  };

  return (
    <div>
     <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Credenciales</h1>
          <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name} — {participantes.length} participantes</p>
        </div>
        {participantes.length > 0 && (
          <button onClick={imprimirTodas}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir todas
          </button>
        )}
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
          <option value="Staff">Staff</option>
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