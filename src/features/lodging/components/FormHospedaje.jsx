import { useState, useEffect } from 'react';

const TIPOS = ['Cabaña', 'Cuarto', 'Tipi', 'Casa', 'Área de Camping'];

export default function FormHospedaje({ lugar, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    name: '', type: 'Cabaña', capacity: '', description: '',
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (lugar) {
      setForm({
        name: lugar.name || '',
        type: lugar.type || 'Cabaña',
        capacity: lugar.capacity || '',
        description: lugar.description || '',
      });
    }
  }, [lugar]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!form.name.trim()) nuevosErrores.name = 'El nombre es obligatorio';
    if (!form.capacity || Number(form.capacity) <= 0) nuevosErrores.capacity = 'La capacidad debe ser mayor a 0';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    await onGuardar({
      name: form.name.trim(),
      type: form.type,
      capacity: Number(form.capacity),
      description: form.description.trim(),
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
            {lugar ? 'Editar Lugar' : 'Nuevo Lugar de Hospedaje'}
          </h1>
          <p className="text-gray-500 text-sm">Completa los datos del lugar</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input type="text" name="name" value={form.name} onChange={cambiar}
              placeholder="Ej: Cabaña 1, Cuarto A..."
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.name ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
            {errores.name && <p className="text-red-500 text-xs mt-1">{errores.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select name="type" value={form.type} onChange={cambiar}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad <span className="text-red-500">*</span>
            </label>
            <input type="number" name="capacity" value={form.capacity} onChange={cambiar}
              placeholder="Número de personas" min="1"
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.capacity ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
            {errores.capacity && <p className="text-red-500 text-xs mt-1">{errores.capacity}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="description" value={form.description} onChange={cambiar}
              placeholder="Notas adicionales..." rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando}
              className="flex-1 bg-primary-800 hover:bg-primary-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (lugar ? 'Guardar cambios' : 'Crear lugar')}
            </button>
            <button type="button" onClick={onCancelar}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}