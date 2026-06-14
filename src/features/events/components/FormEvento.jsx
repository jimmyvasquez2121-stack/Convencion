import { useState, useEffect } from 'react';

const ESTADOS = [
  { value: 'Draft',     label: 'Borrador' },
  { value: 'Open',      label: 'Abierto' },
  { value: 'Closed',    label: 'Cerrado' },
  { value: 'Completed', label: 'Completado' },
];

export default function FormEvento({ evento, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    registrationFee: '',
    maxCapacity: '',
    status: 'Draft',
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (evento) {
      setForm({
        name: evento.name || '',
        description: evento.description || '',
        startDate: evento.startDate || '',
        endDate: evento.endDate || '',
        location: evento.location || '',
        registrationFee: evento.registrationFee || '',
        maxCapacity: evento.maxCapacity || '',
        status: evento.status || 'Draft',
      });
    }
  }, [evento]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!form.name.trim()) nuevosErrores.name = 'El nombre es obligatorio';
    if (!form.startDate) nuevosErrores.startDate = 'La fecha de inicio es obligatoria';
    if (!form.endDate) nuevosErrores.endDate = 'La fecha de fin es obligatoria';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nuevosErrores.endDate = 'La fecha de fin no puede ser antes de la fecha de inicio';
    }
    if (form.registrationFee && isNaN(Number(form.registrationFee))) {
      nuevosErrores.registrationFee = 'Debe ser un número válido';
    }
    if (form.maxCapacity && isNaN(Number(form.maxCapacity))) {
      nuevosErrores.maxCapacity = 'Debe ser un número válido';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    await onGuardar({
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location.trim(),
      registrationFee: form.registrationFee ? Number(form.registrationFee) : 0,
      maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : 0,
      status: form.status,
    });
    setGuardando(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {evento ? 'Editar Evento' : 'Nuevo Evento'}
          </h1>
          <p className="text-gray-500 text-sm">
            {evento ? 'Modifica los datos del evento' : 'Completa los datos para crear un nuevo evento'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del evento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={cambiar}
              placeholder="Ej: Convención Nacional de Niños 2026"
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.name ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`}
            />
            {errores.name && <p className="text-red-500 text-xs mt-1">{errores.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={cambiar}
              placeholder="Descripción del evento..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={cambiar}
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.startDate ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`}
              />
              {errores.startDate && <p className="text-red-500 text-xs mt-1">{errores.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={cambiar}
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.endDate ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`}
              />
              {errores.endDate && <p className="text-red-500 text-xs mt-1">{errores.endDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={cambiar}
              placeholder="Ej: Centro de Convenciones, Ciudad"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuota de registro ($)</label>
              <input
                type="number"
                name="registrationFee"
                value={form.registrationFee}
                onChange={cambiar}
                placeholder="0"
                min="0"
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.registrationFee ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`}
              />
              {errores.registrationFee && <p className="text-red-500 text-xs mt-1">{errores.registrationFee}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad máxima</label>
              <input
                type="number"
                name="maxCapacity"
                value={form.maxCapacity}
                onChange={cambiar}
                placeholder="0"
                min="0"
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.maxCapacity ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`}
              />
              {errores.maxCapacity && <p className="text-red-500 text-xs mt-1">{errores.maxCapacity}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="status"
              value={form.status}
              onChange={cambiar}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white"
            >
              {ESTADOS.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-primary-800 hover:bg-primary-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (evento ? 'Guardar cambios' : 'Crear evento')}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}