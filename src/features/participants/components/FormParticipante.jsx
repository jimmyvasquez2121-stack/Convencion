import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, doc,
  serverTimestamp, query, where, getDocs, orderBy, limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

const TALLAS_NINOS = ['2', '4', '6', '8', '10', '12', '14', '16'];
const TALLAS_ADULTOS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TIPOS = ['Niño', 'Maestro', 'Líder de Niños', 'Pastor', 'Padre/Madre', 'Voluntario', 'Invitado'];

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const generarNumeroRegistro = async (eventId) => {
  const q = query(
    collection(db, 'participants'),
    where('eventId', '==', eventId),
    orderBy('registrationNumber', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 1001;
  const ultimo = snap.docs[0].data().registrationNumber || 1000;
  return ultimo + 1;
};

export default function FormParticipante({ participante, evento, onCancelar, onGuardado }) {
  const { userData } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  const [form, setForm] = useState({
    fullName: '', gender: '', birthDate: '', age: '',
    phone: '', email: '', church: '', district: '', region: '',
    participantType: 'Niño', tshirtSize: '', foodRestrictions: '',
    medicalConditions: '', emergencyContact: '', guardianName: '', notes: '',
  });

  useEffect(() => {
    if (participante) {
      setForm({
        fullName: participante.fullName || '',
        gender: participante.gender || '',
        birthDate: participante.birthDate || '',
        age: participante.age || '',
        phone: participante.phone || '',
        email: participante.email || '',
        church: participante.church || '',
        district: participante.district || '',
        region: participante.region || '',
        participantType: participante.participantType || 'Niño',
        tshirtSize: participante.tshirtSize || '',
        foodRestrictions: participante.foodRestrictions || '',
        medicalConditions: participante.medicalConditions || '',
        emergencyContact: participante.emergencyContact || '',
        guardianName: participante.guardianName || '',
        notes: participante.notes || '',
      });
    }
  }, [participante]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const nuevo = { ...prev, [name]: value };
      if (name === 'birthDate') nuevo.age = calcularEdad(value);
      return nuevo;
    });
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!form.fullName.trim()) nuevosErrores.fullName = 'El nombre es obligatorio';
    if (!form.gender) nuevosErrores.gender = 'El género es obligatorio';
    if (!form.church.trim()) nuevosErrores.church = 'La iglesia es obligatoria';
    if (!form.district.trim()) nuevosErrores.district = 'El distrito es obligatorio';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor completa los campos obligatorios.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        ...form,
        fullName: form.fullName.trim(),
        church: form.church.trim(),
        district: form.district.trim(),
        region: form.region.trim(),
        age: form.age ? Number(form.age) : null,
        eventId: evento.id,
        eventName: evento.name,
        paymentStatus: participante?.paymentStatus || 'pending',
        amountPaid: participante?.amountPaid || 0,
      };
      if (participante) {
        await updateDoc(doc(db, 'participants', participante.id), {
          ...datos, updatedAt: serverTimestamp(), updatedBy: userData.uid
        });
        Swal.fire({ icon: 'success', title: 'Participante actualizado', timer: 1500, showConfirmButton: false });
      } else {
        const registrationNumber = await generarNumeroRegistro(evento.id);
        await addDoc(collection(db, 'participants'), {
          ...datos, registrationNumber, checkedIn: false,
          createdAt: serverTimestamp(), createdBy: userData.uid
        });
        Swal.fire({ icon: 'success', title: 'Participante registrado', text: `Número de registro: ${registrationNumber}`, confirmButtonColor: '#1e3a8a' });
      }
      onGuardado();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const tallasDisponibles = form.participantType === 'Niño' ? TALLAS_NINOS : TALLAS_ADULTOS;

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
            {participante ? 'Editar Participante' : 'Nuevo Participante'}
          </h1>
          <p className="text-gray-500 text-sm">{evento.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Información Personal */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs flex items-center justify-center font-bold">1</span>
            Información Personal
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
              <input type="text" name="fullName" value={form.fullName} onChange={cambiar} placeholder="Nombre y apellidos"
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.fullName ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
              {errores.fullName && <p className="text-red-500 text-xs mt-1">{errores.fullName}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género <span className="text-red-500">*</span></label>
                <select name="gender" value={form.gender} onChange={cambiar}
                  className={`w-full px-4 py-2.5 rounded-lg border ${errores.gender ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition bg-white`}>
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
                {errores.gender && <p className="text-red-500 text-xs mt-1">{errores.gender}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input type="date" name="birthDate" value={form.birthDate} onChange={cambiar}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
            </div>
            {form.age !== '' && (
              <p className="text-sm text-primary-700 font-medium">Edad calculada: {form.age} años</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" name="phone" value={form.phone} onChange={cambiar} placeholder="0000-0000"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input type="email" name="email" value={form.email} onChange={cambiar} placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
            </div>
          </div>
        </div>

        {/* Información de Iglesia */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs flex items-center justify-center font-bold">2</span>
            Información de Iglesia
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Iglesia local <span className="text-red-500">*</span></label>
              <input type="text" name="church" value={form.church} onChange={cambiar} placeholder="Nombre de la iglesia"
                className={`w-full px-4 py-2.5 rounded-lg border ${errores.church ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
              {errores.church && <p className="text-red-500 text-xs mt-1">{errores.church}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito <span className="text-red-500">*</span></label>
                <input type="text" name="district" value={form.district} onChange={cambiar} placeholder="Nombre del distrito"
                  className={`w-full px-4 py-2.5 rounded-lg border ${errores.district ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 outline-none transition`} />
                {errores.district && <p className="text-red-500 text-xs mt-1">{errores.district}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                <input type="text" name="region" value={form.region} onChange={cambiar} placeholder="Nombre de la región"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
            </div>
          </div>
        </div>

        {/* Tipo y Camiseta */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs flex items-center justify-center font-bold">3</span>
            Tipo de Participante
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
              <select name="participantType" value={form.participantType} onChange={cambiar}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talla de camiseta</label>
              <div className="flex flex-wrap gap-2">
                {tallasDisponibles.map(talla => (
                  <button key={talla} type="button"
                    onClick={() => setForm(prev => ({ ...prev, tshirtSize: talla }))}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition
                      ${form.tshirtSize === talla ? 'bg-primary-800 text-white border-primary-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {talla}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs flex items-center justify-center font-bold">4</span>
            Información Adicional
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restricciones alimentarias</label>
              <input type="text" name="foodRestrictions" value={form.foodRestrictions} onChange={cambiar}
                placeholder="Ej: Alérgico al maní, vegetariano..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones médicas</label>
              <input type="text" name="medicalConditions" value={form.medicalConditions} onChange={cambiar}
                placeholder="Ej: Asma, diabetes..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                <input type="text" name="emergencyContact" value={form.emergencyContact} onChange={cambiar}
                  placeholder="Nombre y teléfono"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del padre/tutor</label>
                <input type="text" name="guardianName" value={form.guardianName} onChange={cambiar}
                  placeholder="Nombre completo"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea name="notes" value={form.notes} onChange={cambiar} placeholder="Observaciones adicionales..." rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
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
            ) : (participante ? 'Guardar cambios' : 'Registrar participante')}
          </button>
          <button type="button" onClick={onCancelar}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}