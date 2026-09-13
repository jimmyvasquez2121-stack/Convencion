import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const TIPO_COLORS = {
  'Niño':           { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Maestro':        { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  'Líder de Niños': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Pastor':         { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  'Padre/Madre':    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'Voluntario':     { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  'Invitado':       { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  'Staff':          { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
};

export default function DetalleCredencial({ participante: p, evento, onVolver }) {
  const credencialRef = useRef(null);
  const colores = TIPO_COLORS[p.participantType] || TIPO_COLORS['Invitado'];
  const [grupoNombre, setGrupoNombre] = useState(null);
  const [hospedajeNombre, setHospedajeNombre] = useState(null);

  useEffect(() => {
    const cargarGrupo = async () => {
      try {
        const q = query(
          collection(db, 'groupMembers'),
          where('participantId', '==', p.id),
          where('eventId', '==', evento.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setGrupoNombre(snap.docs[0].data().groupName);
      } catch (error) { console.error(error); }
    };
    cargarGrupo();
  }, [p.id, evento.id]);

  useEffect(() => {
    const cargarHospedaje = async () => {
      try {
        const q = query(
          collection(db, 'lodgingAssignments'),
          where('participantId', '==', p.id),
          where('eventId', '==', evento.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setHospedajeNombre(snap.docs[0].data().lodgingName);
      } catch (error) { console.error(error); }
    };
    cargarHospedaje();
  }, [p.id, evento.id]);

  const qrData = JSON.stringify({
    id: p.id, reg: p.registrationNumber,
    name: p.fullName, type: p.participantType, event: evento.id
  });

  const handlePrint = () => {
   const qrSvg = document.querySelector('#qr-print svg');
   const qrSvgHtml = qrSvg ? qrSvg.outerHTML : '';

    const contenido = `
      <html>
      <head>
        <title>Credencial - ${p.fullName}</title>
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: 54mm 85mm; margin: 0; }
          body { font-family: Arial, sans-serif; width: 54mm; height: 85mm; overflow: hidden; background: white; }
          .credencial { width: 54mm; height: 85mm; display: flex; flex-direction: column; overflow: hidden; }
          .header { background: #1e3a8a !important; color: white; padding: 6px 8px; text-align: center; }
          .header h2 { font-size: 8px; font-weight: bold; line-height: 1.2; }
          .header p { font-size: 6.5px; opacity: 0.8; margin-top: 2px; }
          .tipo-badge { margin: 4px auto 0; display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 7px; font-weight: bold;
            background: ${colores.bg} !important; color: ${colores.text}; border: 1px solid ${colores.border}; }
          .body { flex: 1; padding: 6px 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .qr-box { width: 170px; height: 170px; margin: 0 auto 4px; border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 4px; background: white; }
          .qr-box svg { width: 100%; height: 100%; display: blok; }
          .nombre { font-size: 9px; font-weight: bold; color: #1f2937; margin: 3px 0 1px; line-height: 1.2; }
          .reg { font-size: 7px; color: #6b7280; margin-bottom: 2px; }
          .info { font-size: 7px; color: #374151; margin-bottom: 1px; }
          .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 6.5px; font-weight: bold; margin: 1px 1px 0; }
          .badge-purple { background: #f3e8ff !important; color: #7c3aed; }
          .badge-orange { background: #ffedd5 !important; color: #c2410c; }
          .footer { background: #f9fafb !important; border-top: 1px solid #e5e7eb; padding: 4px; text-align: center; font-size: 6px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="credencial">
          <div class="header">
            <h2>${evento.name}</h2>
            <p>Iglesia de Dios — Directiva Infantil Nacional</p>
            <div class="tipo-badge">${p.participantType}</div>
          </div>
          <div class="body">
            <div class="qr-box">
              ${qrSvgHtml ||'<p style="font-size:6px;color:#999">QR</p>'}
            </div>
            <div class="nombre">${p.fullName}</div>
            <div class="reg">Registro #${p.registrationNumber}</div>
            ${p.church ? `<div class="info">${p.church}</div>` : ''}
            ${p.district ? `<div class="info" style="color:#6b7280;font-size:6.5px">${p.district}</div>` : ''}
            <div style="margin-top:3px">
              ${grupoNombre ? `<span class="badge badge-purple">${grupoNombre}</span>` : ''}
              ${hospedajeNombre ? `<span class="badge badge-orange">🏠 ${hospedajeNombre}</span>` : ''}
            </div>
          </div>
          <div class="footer">Credencial válida únicamente para este evento</div>
        </div>
      </body>
      </html>
    `;
    const ventana = window.open('', '_blank', 'width=300,height=500');
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.print();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Credencial</h1>
          <p className="text-gray-500 text-sm">{p.fullName}</p>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
      </div>

      <div className="flex justify-center">
        <div ref={credencialRef} className="w-80 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
          <div className="bg-primary-900 text-white p-5 text-center">
            <p className="font-bold text-sm leading-tight">{evento.name}</p>
            <p className="text-primary-200 text-xs mt-1">Iglesia de Dios — Directiva Infantil Nacional</p>
            <div className="mt-3">
              <span className="text-xs font-bold px-4 py-1.5 rounded-full"
                style={{ background: colores.bg, color: colores.text, border: `1px solid ${colores.border}` }}>
                {p.participantType}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 text-center">
            <div className="flex justify-center mb-4">
              <div id="qr-print" className="p-3 border-2 border-gray-200 rounded-xl bg-white inline-block">
                <QRCodeSVG value={qrData} size={140} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mt-2">{p.fullName}</h2>
            <p className="text-gray-400 text-sm mt-1">Registro #{p.registrationNumber}</p>
            {p.church && <p className="text-gray-600 text-sm mt-2 font-medium">{p.church}</p>}
            {p.district && <p className="text-gray-400 text-xs mt-1">{p.district}</p>}
            {p.region && <p className="text-gray-400 text-xs">{p.region}</p>}
            {grupoNombre && (
              <div className="mt-2 inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                {grupoNombre}
              </div>
            )}
            {hospedajeNombre && (
              <div className="mt-1 inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
                🏠 {hospedajeNombre}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-center">
            <p className="text-xs text-gray-400">Credencial válida únicamente para este evento</p>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-sm mx-auto bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Información del participante</h3>
        <div className="space-y-2 text-sm">
          {p.gender && <div className="flex justify-between"><span className="text-gray-400">Género</span><span className="text-gray-700">{p.gender}</span></div>}
          {p.age && <div className="flex justify-between"><span className="text-gray-400">Edad</span><span className="text-gray-700">{p.age} años</span></div>}
          {p.tshirtSize && <div className="flex justify-between"><span className="text-gray-400">Camiseta</span><span className="text-gray-700 font-semibold">{p.tshirtSize}</span></div>}
          <div className="flex justify-between">
            <span className="text-gray-400">Pago</span>
            <span className={`font-semibold ${p.paymentStatus === 'paid' ? 'text-green-600' : p.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>
              {p.paymentStatus === 'paid' ? '✅ Pagado' : p.paymentStatus === 'partial' ? '⚠️ Parcial' : '❌ Pendiente'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Check-In</span>
            <span className={`font-semibold ${p.checkedIn ? 'text-green-600' : 'text-gray-400'}`}>
              {p.checkedIn ? '✅ Registrado' : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}