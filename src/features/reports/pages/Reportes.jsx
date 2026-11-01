import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const estadoPago = (p) =>
  p.paymentStatus === 'paid' ? 'Pagado' : p.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente';

const limpiarNombre = (t) => String(t || '').replace(/[\\/:*?"<>|]/g, '').trim();

export default function Reportes() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroDistrito, setFiltroDistrito] = useState('');
  const { eventoActivo } = useEvent();
  const { userData, isAdminNacional } = useAuth();

  useEffect(() => {
    if (!eventoActivo) { setLoading(false); return; }
    let q;
    if (isAdminNacional()) {
      q = query(collection(db, 'participants'), where('eventId', '==', eventoActivo.id));
    } else {
      q = query(
        collection(db, 'participants'),
        where('eventId', '==', eventoActivo.id),
        where('district', '==', userData.distrito)
      );
    }
    const unsub = onSnapshot(q, snap => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo, userData]);

  // Lista de distritos que tienen participantes en el evento
  const distritos = [...new Set(participantes.map(p => p.district).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  // Participantes del reporte (todos o solo del distrito elegido), ordenados por registro
  const lista = participantes
    .filter(p => !filtroDistrito || p.district === filtroDistrito)
    .sort((a, b) => (a.registrationNumber || 0) - (b.registrationNumber || 0));

  const etiquetaDistrito = filtroDistrito || (isAdminNacional() ? 'Todos los distritos' : (userData?.distrito || ''));
  const sufijoArchivo = filtroDistrito ? `_${limpiarNombre(filtroDistrito)}` : '';

  // Cuota según el tipo: Niño paga cuota de niños, los demás cuota de adultos
  const cuotaNinos = eventoActivo?.registrationFeeNinos ?? eventoActivo?.registrationFee ?? 0;
  const cuotaAdultos = eventoActivo?.registrationFeeAdultos ?? eventoActivo?.registrationFee ?? 0;
  const cuotaDe = (p) => (p.participantType === 'Niño' ? cuotaNinos : cuotaAdultos);

  const totalRecaudado = lista.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalEsperado = lista.reduce((s, p) => s + cuotaDe(p), 0);

  const exportarExcelGeneral = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['#', 'Registro', 'Nombre', 'Género', 'Edad', 'Tipo', 'Iglesia', 'Distrito', 'Región', 'Camiseta', 'Pago', 'Monto Pagado', 'Check-In'],
      ...lista.map((p, i) => [
        i + 1, p.registrationNumber, p.fullName, p.gender, p.age,
        p.participantType, p.church, p.district, p.region,
        p.tshirtSize || '—',
        estadoPago(p),
        p.amountPaid || 0,
        p.checkedIn ? 'Sí' : 'No'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Participantes');
    XLSX.writeFile(wb, `Reporte_${limpiarNombre(eventoActivo.name)}${sufijoArchivo}.xlsx`);
  };

  const exportarExcelPagos = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['#', 'Registro', 'Nombre', 'Tipo', 'Iglesia', 'Distrito', 'Estado', 'Cuota', 'Monto Pagado', 'Saldo'],
      ...lista.map((p, i) => {
        const cuota = cuotaDe(p);
        const saldo = cuota - (p.amountPaid || 0);
        return [
          i + 1, p.registrationNumber, p.fullName, p.participantType, p.church, p.district,
          estadoPago(p),
          cuota, p.amountPaid || 0, saldo > 0 ? saldo : 0
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Pagos');
    XLSX.writeFile(wb, `Pagos_${limpiarNombre(eventoActivo.name)}${sufijoArchivo}.xlsx`);
  };

  const exportarPDFGeneral = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(eventoActivo.name, 14, 20);
    doc.setFontSize(11);
    doc.text('Reporte General de Participantes', 14, 28);
    doc.text(`Distrito: ${etiquetaDistrito}`, 14, 35);
    doc.text(`Total: ${lista.length} participantes`, 14, 42);
    doc.autoTable({
      startY: 49,
      head: [['#', 'Registro', 'Nombre', 'Tipo', 'Iglesia', 'Distrito', 'Pago']],
      body: lista.map((p, i) => [
        i + 1, p.registrationNumber, p.fullName, p.participantType,
        p.church, p.district,
        estadoPago(p)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Reporte_${limpiarNombre(eventoActivo.name)}${sufijoArchivo}.pdf`);
  };

  const exportarPDFPagos = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(eventoActivo.name, 14, 20);
    doc.setFontSize(11);
    doc.text('Reporte de Pagos', 14, 28);
    doc.text(`Distrito: ${etiquetaDistrito}`, 14, 35);
    doc.text(`Recaudado: $${totalRecaudado.toLocaleString()} / Esperado: $${totalEsperado.toLocaleString()}`, 14, 42);
    doc.autoTable({
      startY: 49,
      head: [['#', 'Nombre', 'Tipo', 'Iglesia', 'Estado', 'Pagado', 'Saldo']],
      body: lista.map((p, i) => {
        const saldo = cuotaDe(p) - (p.amountPaid || 0);
        return [
          i + 1, p.fullName, p.participantType, p.church,
          estadoPago(p),
          `$${(p.amountPaid || 0).toLocaleString()}`,
          `$${saldo > 0 ? saldo.toLocaleString() : '0'}`
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Pagos_${limpiarNombre(eventoActivo.name)}${sufijoArchivo}.pdf`);
  };

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
      </div>
    );
  }

  const REPORTES = [
    {
      titulo: 'Reporte General',
      descripcion: 'Lista completa de todos los participantes con toda su información.',
      icon: '👥',
      color: 'bg-blue-50 border-blue-200',
      acciones: [
        { label: 'Exportar Excel', color: 'bg-green-600 hover:bg-green-700', fn: exportarExcelGeneral },
        { label: 'Exportar PDF', color: 'bg-red-600 hover:bg-red-700', fn: exportarPDFGeneral },
      ]
    },
    {
      titulo: 'Reporte de Pagos',
      descripcion: 'Estado de pagos, montos pagados y saldos pendientes.',
      icon: '💰',
      color: 'bg-green-50 border-green-200',
      acciones: [
        { label: 'Exportar Excel', color: 'bg-green-600 hover:bg-green-700', fn: exportarExcelPagos },
        { label: 'Exportar PDF', color: 'bg-red-600 hover:bg-red-700', fn: exportarPDFPagos },
      ]
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name} — {lista.length} participantes</p>
      </div>

      {/* Filtro por distrito */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Distrito del reporte:</label>
        {isAdminNacional() ? (
          <select
            value={filtroDistrito}
            onChange={e => setFiltroDistrito(e.target.value)}
            className="flex-1 sm:max-w-xs px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm bg-white"
          >
            <option value="">Todos los distritos</option>
            {distritos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <span className="font-semibold text-primary-800">{userData?.distrito}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {REPORTES.map(reporte => (
            <div key={reporte.titulo} className={`rounded-xl border p-5 ${reporte.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{reporte.icon}</span>
                <div>
                  <h2 className="font-bold text-gray-800">{reporte.titulo}</h2>
                  <p className="text-xs text-gray-500">{reporte.descripcion}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {reporte.acciones.map(accion => (
                  <button key={accion.label} onClick={accion.fn} disabled={lista.length === 0}
                    className={`flex-1 ${accion.color} text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50`}>
                    {accion.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-1">Resumen del Evento</h2>
        <p className="text-xs text-gray-400 mb-4">{etiquetaDistrito}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Total</p>
            <p className="text-2xl font-bold text-primary-800 mt-1">{lista.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Pagados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{lista.filter(p => p.paymentStatus === 'paid').length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Recaudado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">${totalRecaudado.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Check-In</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{lista.filter(p => p.checkedIn).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}