import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import DetalleCredencial from '../components/DetalleCredencial';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';
import Swal from 'sweetalert2';

const TIPO_COLORS = {
  'Niño':           'bg-blue-100 text-blue-700',
  'Maestro':        'bg-purple-100 text-purple-700',
  'Líder de Niños': 'bg-green-100 text-green-700',
  'Pastor':         'bg-yellow-100 text-yellow-700',
  'Padre/Madre':    'bg-orange-100 text-orange-700',
  'Voluntario':     'bg-pink-100 text-pink-700',
  'Joven':          'bg-teal-100 text-teal-700',
  'Invitado':       'bg-gray-100 text-gray-700',
  'Staff':          'bg-blue-100 text-blue-700',
};

// Colores de la etiqueta del tipo en la credencial impresa
const COLORES_IMPRESION = {
  'Niño':           { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Maestro':        { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  'Líder de Niños': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Pastor':         { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  'Padre/Madre':    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'Voluntario':     { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  'Joven':          { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
  'Staff':          { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  'Invitado':       { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function Credenciales() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDistrito, setFiltroDistrito] = useState('');
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);
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

  // Distritos que tienen participantes en este evento (para el selector)
  const distritosDisponibles = [...new Set(participantes.map(p => p.district).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const filtrados = participantes.filter(p => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = !busqueda ||
      p.fullName?.toLowerCase().includes(texto) ||
      p.registrationNumber?.toString().includes(texto) ||
      p.church?.toLowerCase().includes(texto);
    const coincideTipo = !filtroTipo || p.participantType === filtroTipo;
    const coincideDistrito = !filtroDistrito || p.district === filtroDistrito;
    return coincideTexto && coincideTipo && coincideDistrito;
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

  // Busca el grupo y el hospedaje de cada participante
  const cargarGruposYHospedaje = async (lista) => {
    const grupoPorParticipante = {};
    const hospedajePorParticipante = {};

    // Hospedaje
    try {
      const snapHosp = await getDocs(
        query(collection(db, 'lodgingAssignments'), where('eventId', '==', eventoActivo.id))
      );
      snapHosp.docs.forEach(d => {
        const a = d.data();
        if (a.participantId && a.lodgingName) hospedajePorParticipante[a.participantId] = a.lodgingName;
      });
    } catch (error) {
      console.error('No se pudo leer el hospedaje:', error);
    }

    // Grupos
    try {
      const nombresGrupos = {};
      try {
        const snapGrupos = await getDocs(
          query(collection(db, 'groups'), where('eventId', '==', eventoActivo.id))
        );
        snapGrupos.docs.forEach(d => { nombresGrupos[d.id] = d.data().name; });
      } catch (error) {
        console.error('No se pudieron leer los grupos:', error);
      }

      const ids = lista.map(p => p.id);
      const lotes = [];
      for (let i = 0; i < ids.length; i += 30) lotes.push(ids.slice(i, i + 30));
      const respuestas = await Promise.all(
        lotes.map(lote => getDocs(query(collection(db, 'groupMembers'), where('participantId', 'in', lote))))
      );
      respuestas.forEach(snap => {
        snap.docs.forEach(d => {
          const m = d.data();
          const nombre = m.groupName || m.grupoNombre || nombresGrupos[m.groupId];
          if (m.participantId && nombre) grupoPorParticipante[m.participantId] = nombre;
        });
      });
    } catch (error) {
      console.error('No se pudo leer los miembros de grupos:', error);
    }

    return { grupoPorParticipante, hospedajePorParticipante };
  };

  const imprimirTodas = async () => {
    if (filtrados.length === 0) return;
    setImprimiendo(true);
    try {
      const { grupoPorParticipante, hospedajePorParticipante } = await cargarGruposYHospedaje(filtrados);

      const subtitulo = eventoActivo?.ministerio === 'juvenil' ? 'Directiva Juvenil Nacional' : 'Iglesia de Dios';

      const tarjetas = filtrados.map(p => {
        const color = COLORES_IMPRESION[p.participantType] || COLORES_IMPRESION['Invitado'];
        const grupo = grupoPorParticipante[p.id];
        const hospedaje = hospedajePorParticipante[p.id];
        const qr = renderToStaticMarkup(
          <QRCodeSVG
            value={JSON.stringify({ id: p.id, reg: p.registrationNumber, name: p.fullName, event: eventoActivo.id })}
            size={90}
          />
        );
        return `
          <div class="cred">
            <div class="cred-header">
              <div class="cred-evento">${esc(eventoActivo.name)}</div>
              <div class="cred-sub">${esc(subtitulo)}</div>
              <div class="cred-tipo" style="background:${color.bg};color:${color.text};border:1px solid ${color.border}">${esc(p.participantType)}</div>
            </div>
            <div class="cred-body">
              <div class="cred-qr">${qr}</div>
              <div class="cred-nombre">${esc(p.fullName)}</div>
              <div class="cred-reg">Registro #${esc(p.registrationNumber)}</div>
              ${p.church ? `<div class="cred-info">${esc(p.church)}</div>` : ''}
              ${p.district ? `<div class="cred-info cred-distrito">${esc(p.district)}</div>` : ''}
              ${grupo ? `<div class="cred-dato cred-grupo">Grupo: ${esc(grupo)}</div>` : ''}
              ${hospedaje ? `<div class="cred-dato cred-hosp">Hospedaje: ${esc(hospedaje)}</div>` : ''}
            </div>
            <div class="cred-footer">Credencial válida únicamente para este evento</div>
          </div>
        `;
      });

      // 9 credenciales por hoja (3 por fila, 3 filas)
      const paginas = [];
      for (let i = 0; i < tarjetas.length; i += 9) paginas.push(tarjetas.slice(i, i + 9));
      const html = paginas.map(pg => `<div class="cred-pagina">${pg.join('')}</div>`).join('');

      // Limpiar restos de una impresión anterior
      document.getElementById('print-area')?.remove();
      document.getElementById('print-area-style')?.remove();

      const estilo = document.createElement('style');
      estilo.id = 'print-area-style';
      estilo.textContent = `
        #print-area { display: none; }
        @media print {
          body > *:not(#print-area) { display: none !important; }
          #print-area { display: block !important; background: white; }
          @page { margin: 6mm 8mm; }
          #print-area .cred-pagina { page-break-after: always; break-after: page; }
          #print-area .cred-pagina:last-child { page-break-after: auto; break-after: auto; }
        }
        #print-area, #print-area * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
        #print-area { font-family: Arial, sans-serif; }
        #print-area .cred-pagina { display: grid; grid-template-columns: repeat(3, 54mm); column-gap: 4mm; row-gap: 3mm; justify-content: center; }
        #print-area .cred { width: 54mm; height: 85mm; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; background: white; page-break-inside: avoid; break-inside: avoid; }
        #print-area .cred-header { background: #1e3a8a; color: white; padding: 6px 8px; text-align: center; }
        #print-area .cred-evento { font-size: 8px; font-weight: bold; line-height: 1.2; }
        #print-area .cred-sub { font-size: 6px; opacity: 0.85; margin-top: 2px; }
        #print-area .cred-tipo { margin-top: 4px; display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: 7px; font-weight: bold; }
        #print-area .cred-body { flex: 1; padding: 4px 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #print-area .cred-qr { width: 90px; height: 90px; margin-bottom: 3px; }
        #print-area .cred-qr svg { width: 90px; height: 90px; display: block; }
        #print-area .cred-nombre { font-size: 9px; font-weight: bold; color: #1f2937; margin: 2px 0 1px; line-height: 1.2; }
        #print-area .cred-reg { font-size: 7px; color: #6b7280; margin-bottom: 1px; }
        #print-area .cred-info { font-size: 7px; color: #374151; line-height: 1.2; }
        #print-area .cred-distrito { color: #6b7280; }
        #print-area .cred-dato { font-size: 7.5px; font-weight: bold; margin-top: 2px; padding: 1px 6px; border-radius: 6px; }
        #print-area .cred-grupo { background: #ede9fe; color: #6d28d9; }
        #print-area .cred-hosp { background: #ffedd5; color: #c2410c; }
        #print-area .cred-footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 3px; text-align: center; font-size: 5px; color: #9ca3af; }
      `;
      document.head.appendChild(estilo);

      const area = document.createElement('div');
      area.id = 'print-area';
      area.innerHTML = html;
      document.body.appendChild(area);

      const limpiar = () => {
        area.remove();
        estilo.remove();
        window.removeEventListener('afterprint', limpiar);
      };
      window.addEventListener('afterprint', limpiar);
      setTimeout(() => window.print(), 200);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setImprimiendo(false);
    }
  };

  const hayFiltros = busqueda || filtroTipo || filtroDistrito;

  return (
    <div>
     <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Credenciales</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {eventoActivo.name} — {hayFiltros ? `${filtrados.length} de ${participantes.length}` : participantes.length} participantes
          </p>
        </div>
        {filtrados.length > 0 && (
          <button onClick={imprimirTodas} disabled={imprimiendo}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {imprimiendo ? 'Preparando...' : `Imprimir todas (${filtrados.length})`}
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
        {isAdminNacional() && (
          <select
            value={filtroDistrito}
            onChange={e => setFiltroDistrito(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
          >
            <option value="">Todos los distritos</option>
            {distritosDisponibles.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="Niño">Niño</option>
          <option value="Joven">Joven</option>
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