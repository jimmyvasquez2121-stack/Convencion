import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TIPO_COLORS = {
  'Niño':           { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Maestro':        { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  'Líder de Niños': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Pastor':         { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  'Padre/Madre':    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'Voluntario':     { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  'Invitado':       { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

export default function DetalleCredencial({ participante: p, evento, onVolver }) {
  const credencialRef = useRef(null);
  const colores = TIPO_COLORS[p.participantType] || TIPO_COLORS['Invitado'];

  const qrData = JSON.stringify({
    id: p.id, reg: p.registrationNumber,
    name: p.fullName, type: p.participantType, event: evento.id
  });

  const handlePrint = () => {
    const contenido = `
      <html>
      <head>
        <title>Credencial - ${p.fullName}</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
          .credencial { width: 320px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); background: white; }
          .header { background: #1e3a8a; color: white; padding: 16px; text-align: center; }
          .header h2 { margin: 0; font-size: 14px; font-weight: bold; }
          .header p { margin: 4px 0 0; font-size: 11px; opacity: 0.8; }
          .tipo-badge { margin: 12px auto 0; display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;
            background: ${colores.bg}; color: ${colores.text}; border: 1px solid ${colores.border}; }
          .body { padding: 20px; text-align: center; }
          .nombre { font-size: 18px; font-weight: bold; color: #1f2937; margin: 12px 0 4px; }
          .reg { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
          .iglesia { font-size: 12px; color: #374151; margin-bottom: 4px; }
          .distrito { font-size: 11px; color: #6b7280; }
          .qr-box { margin: 16px auto; padding: 12px; background: white; border: 2px solid #e5e7eb; border-radius: 12px; display: inline-block; }
          .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 10px; text-align: center; font-size: 10px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="credencial">
          <div class="header">
            <h2>${evento.name}</h2>
            <p>Iglesia de Dios — Ministerio Nacional de Niños</p>
            <div class="tipo-badge">${p.participantType}</div>
          </div>
          <div class="body">
            <div class="qr-box">[Escanear QR desde la app]</div>
            <div class="nombre">${p.fullName}</div>
            <div class="reg">Registro #${p.registrationNumber}</div>
            ${p.church ? `<div class="iglesia">${p.church}</div>` : ''}
            ${p.district ? `<div class="distrito">${p.district}</div>` : ''}
          </div>
          <div class="footer">Credencial válida únicamente para este evento</div>
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
            <p className="text-primary-200 text-xs mt-1">Iglesia de Dios — Ministerio Nacional de Niños</p>
            <div className="mt-3">
              <span className="text-xs font-bold px-4 py-1.5 rounded-full"
                style={{ background: colores.bg, color: colores.text, border: `1px solid ${colores.border}` }}>
                {p.participantType}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 border-2 border-gray-200 rounded-xl bg-white inline-block">
                <QRCodeSVG value={qrData} size={140} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mt-2">{p.fullName}</h2>
            <p className="text-gray-400 text-sm mt-1">Registro #{p.registrationNumber}</p>
            {p.church && <p className="text-gray-600 text-sm mt-2 font-medium">{p.church}</p>}
            {p.district && <p className="text-gray-400 text-xs mt-1">{p.district}</p>}
            {p.region && <p className="text-gray-400 text-xs">{p.region}</p>}
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