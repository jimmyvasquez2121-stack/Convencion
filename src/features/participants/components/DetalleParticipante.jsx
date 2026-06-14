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

function Fila({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}

export default function DetalleParticipante({ participante: p, onVolver, onEditar, onEliminar }) {
  if (!p) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800 truncate">{p.fullName}</h1>
          <p className="text-gray-500 text-sm">Registro #{p.registrationNumber}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEditar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button onClick={onEliminar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 max-w-4xl">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Estado de pago</p>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${PAYMENT_COLORS[p.paymentStatus] || PAYMENT_COLORS.pending}`}>
              {PAYMENT_LABELS[p.paymentStatus] || 'Pendiente'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Monto pagado</p>
            <p className="text-lg font-bold text-gray-800">${(p.amountPaid || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Check-In</p>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${p.checkedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.checkedIn ? '✓ Registrado' : 'Pendiente'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Tipo</p>
            <p className="text-sm font-semibold text-gray-700">{p.participantType}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Información Personal</h2>
          <Fila label="Nombre" value={p.fullName} />
          <Fila label="Género" value={p.gender} />
          <Fila label="Fecha nacimiento" value={p.birthDate} />
          <Fila label="Edad" value={p.age ? `${p.age} años` : null} />
          <Fila label="Teléfono" value={p.phone} />
          <Fila label="Correo" value={p.email} />
          <Fila label="Talla camiseta" value={p.tshirtSize} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Información de Iglesia</h2>
          <Fila label="Iglesia" value={p.church} />
          <Fila label="Distrito" value={p.district} />
          <Fila label="Región" value={p.region} />
        </div>

        {(p.foodRestrictions || p.medicalConditions || p.emergencyContact || p.guardianName || p.notes) && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Información Adicional</h2>
            <Fila label="Restricciones alimentarias" value={p.foodRestrictions} />
            <Fila label="Condiciones médicas" value={p.medicalConditions} />
            <Fila label="Contacto de emergencia" value={p.emergencyContact} />
            <Fila label="Padre/Tutor" value={p.guardianName} />
            <Fila label="Notas" value={p.notes} />
          </div>
        )}
      </div>
    </div>
  );
}