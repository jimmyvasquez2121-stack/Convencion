import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reportes() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { eventoActivo } = useEvent();

  useEffect(() => {
    if (!eventoActivo) { setLoading(false); return; }
    const unsub = onSnapshot(query(collection(db, 'participants'), where('eventId', '==', eventoActivo.id)), snap => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  const exportarExcelGeneral = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['#', 'Registro', 'Nombre', 'Género', 'Edad', 'Tipo', 'Iglesia', 'Distrito', 'Región', 'Camiseta', 'Pago', 'Monto Pagado', 'Check-In'],
      ...participantes.map((p, i) => [
        i + 1, p.registrationNumber, p.fullName, p.gender, p.age,
        p.participantType, p.church, p.district, p.region,
        p.tshirtSize || '—',
        p.paymentStatus === 'paid' ? 'Pagado' : p.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente',
        p.amountPaid || 0,
        p.checkedIn ? 'Sí' : 'No'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Participantes');
    XLSX.writeFile(wb, `Reporte_${eventoActivo.name}.xlsx`);
  };

  const exportarExcelPagos = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['#', 'Registro', 'Nombre', 'Iglesia', 'Distrito', 'Estado', 'Monto Pagado', 'Saldo'],
      ...participantes.map((p, i) => {
        const saldo = (eventoActivo.registrationFee || 0) - (p.amountPaid || 0);
        return [
          i + 1, p.registrationNumber, p.fullName, p.church, p.district,
          p.paymentStatus === 'paid' ? 'Pagado' : p.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente',
          p.amountPaid || 0, saldo > 0 ? saldo : 0
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Pagos');
    XLSX.writeFile(wb, `Pagos_${eventoActivo.name}.xlsx`);
  };

  const exportarPDFGeneral = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(eventoActivo.name, 14, 20);
    doc.setFontSize(11);
    doc.text('Reporte General de Participantes', 14, 28);
    doc.text(`Total: ${participantes.length} participantes`, 14, 35);
    doc.autoTable({
      startY: 42,
      head: [['#', 'Registro', 'Nombre', 'Tipo', 'Iglesia', 'Distrito', 'Pago']],
      body: participantes.map((p, i) => [
        i + 1, p.registrationNumber, p.fullName, p.participantType,
        p.church, p.district,
        p.paymentStatus === 'paid' ? 'Pagado' : p.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Reporte_${eventoActivo.name}.pdf`);
  };

  const exportarPDFPagos = () => {
    const doc = new jsPDF();
    const totalRecaudado = participantes.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalEsperado = participantes.length * (eventoActivo.registrationFee || 0);
    doc.setFontSize(16);
    doc.text(eventoActivo.name, 14, 20);
    doc.setFontSize(11);
    doc.text('Reporte de Pagos', 14, 28);
    doc.text(`Recaudado: $${totalRecaudado.toLocaleString()} / Esperado: $${totalEsperado.toLocaleString()}`, 14, 35);
    doc.autoTable({
      startY: 42,
      head: [['#', 'Nombre', 'Iglesia', 'Estado', 'Pagado', 'Saldo']],
      body: participantes.map((p, i) => {
        const saldo = (eventoActivo.registrationFee || 0) - (p.amountPaid || 0);
        return [
          i + 1, p.fullName, p.church,
          p.paymentStatus === 'paid' ? 'Pagado' : p.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente',
          `$${(p.amountPaid || 0).toLocaleString()}`,
          `$${saldo > 0 ? saldo.toLocaleString() : '0'}`
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Pagos_${eventoActivo.name}.pdf`);
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
        <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name} — {participantes.length} participantes</p>
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
                  <button key={accion.label} onClick={accion.fn}
                    className={`flex-1 ${accion.color} text-white text-sm font-medium py-2 rounded-lg transition`}>
                    {accion.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Resumen del Evento</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Total</p>
            <p className="text-2xl font-bold text-primary-800 mt-1">{participantes.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Pagados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{participantes.filter(p => p.paymentStatus === 'paid').length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Recaudado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">${participantes.reduce((s, p) => s + (p.amountPaid || 0), 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">Check-In</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{participantes.filter(p => p.checkedIn).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}