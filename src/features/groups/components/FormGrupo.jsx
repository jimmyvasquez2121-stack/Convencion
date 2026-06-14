import { useState, useEffect } from 'react';

export default function FormGrupo({ grupo, colores, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    name: '', color: 'Rojo', teacher: '', leader: '', capacity: '', description: ''
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (grupo) {
      setForm({
        name: grupo.name || '',
        color: grupo.color || 'Rojo',
        teacher: grupo.teacher || '',
        leader: grupo.leader || '',
        capacity: grupo.capacity || '',
        description: grupo.description || '',
      });
    }
  }, [grupo]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!form.name.trim()) nuevosErrores.name = 'El nombre es obligatorio';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    await onGuardar({
      name: form.name.trim(),
      color: form.color,
      teacher: form.teacher.trim(),
      leader: form.leader.trim(),
      capacity: form.capacity ? Number(form.capacity) : 0,
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
          <h1 className="text-2xl font-bold text-gray-800">{grupo ? 'Editar Grupo' : 'Nuevo Grupo'}</h1>
          <p className="text-gray-500 text-sm">Completa los datos del grupo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input type="text" name="name" value={form.name} onChange={cambiar}
              placeholder="Ej: Grupo Leones, Grupo Águilas..."
              className={`w-full px-4 py-2.5 rounded-lg border ${errores.name ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
            {errores.name && <p className="text-red-500 text-xs mt-1">{errores.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color del grupo</label>
            <div className="flex flex-wrap gap-2">
              {colores.map(c => (
                <button key={c.name} type="button"
                  onClick={() => setForm(prev => ({ ...prev, color: c.name }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition
                    ${form.color === c.name ? 'border-primary-500 ring-2 ring-primary-300' : 'border-gray-200'}`}>
                  <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maestro</label>
              <input type="text" name="teacher" value={form.teacher} onChange={cambiar}
                placeholder="Nombre del maestro"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Líder</label>
              <input type="text" name="leader" value={form.leader} onChange={cambiar}
                placeholder="Nombre del líder"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad máxima</label>
            <input type="number" name="capacity" value={form.capacity} onChange={cambiar}
              placeholder="0 = sin límite" min="0"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
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
              ) : (grupo ? 'Guardar cambios' : 'Crear grupo')}
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