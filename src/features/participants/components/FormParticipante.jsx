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
const TIPOS = ['Niño', 'Maestro', 'Líder de Niños', 'Pastor', 'Padre/Madre', 'Voluntario', 'Staff', 'Invitado'];

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const generarGrupoId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generarNumeroRegistro = async (eventId) => {
  try {
    const q = query(
      collection(db, 'participants'),
      where('eventId', '==', eventId),
      orderBy('registrationNumber', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 1001;
    const ultimo = snap.docs[0].data().registrationNumber;
    if (!ultimo || isNaN(ultimo)) return 1001;
    return Number(ultimo) + 1;
  } catch (error) {
    console.error('Error generando número:', error);
    return Math.floor(Math.random() * 9000) + 1000;
  }
};

const formularioVacio = (distrito = '', region = '', church = '') => ({
  fullName: '', gender: '', birthDate: '', age: '',
  phone: '', email: '', church, district: distrito, region,
  participantType: 'Niño', tshirtSize: '', foodRestrictions: '',
  medicalConditions: '', emergencyContact: '', guardianName: '', notes: '',
});

function SubFormulario({ index, data, onChange, onRemove, isNacional, userData, showRemove }) {
  const tallasDisponibles = data.participantType === 'Niño' ? TALLAS_NINOS : TALLAS_ADULTOS;

  const cambiar = (e) => {
    const { name, value } = e.target;
    const nuevo = { ...data, [name]: value };
    if (name === 'birthDate') nuevo.age = calcularEdad(value);
    onChange(index, nuevo);
  };

  const setTalla = (talla) => {
    onChange(index, { ...data, tshirtSize: talla });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">
          {index === 0 ? '👶 Participante principal' : `👤 Acompañante ${index}`}
        </h3>
        {showRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-600 transition text-sm">
            ✕ Quitar
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
        <input type="text" name="fullName" value={data.fullName} onChange={cambiar}
          placeholder="Nombre y apellidos"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Género <span className="text-red-500">*</span></label>
          <select name="gender" value={data.gender} onChange={cambiar}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
            <option value="">Seleccionar</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
          <input type="date" name="birthDate" value={data.birthDate} onChange={cambiar}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
      </div>

      {data.age !== '' && data.age !== undefined && (
        <p className="text-sm text-primary-700 font-medium">Edad calculada: {data.age} años</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input type="tel" name="phone" value={data.phone} onChange={cambiar}
            placeholder="0000-0000"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
          <input type="email" name="email" value={data.email} onChange={cambiar}
            placeholder="correo@ejemplo.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
      </div>

      {index === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Iglesia <span className="text-red-500">*</span></label>
            <input type="text" name="church" value={data.church} onChange={cambiar}
              placeholder="Nombre de la iglesia"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distrito <span className="text-red-500">*</span></label>
              <input type="text" name="district" value={data.district} onChange={cambiar}
                placeholder="Nombre del distrito"
                disabled={!isNacional}
                className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition ${!isNacional ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento, pueblo o ciudad</label>
              <input type="text" name="region" value={data.region} onChange={cambiar}
                placeholder="Nombre de la región"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
        <select name="participantType" value={data.participantType} onChange={cambiar}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition bg-white">
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Talla de camiseta</label>
        <div className="flex flex-wrap gap-2">
          {tallasDisponibles.map(talla => (
            <button key={talla} type="button" onClick={() => setTalla(talla)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition
                ${data.tshirtSize === talla ? 'bg-primary-800 text-white border-primary-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {talla}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restricciones alimentarias</label>
          <input type="text" name="foodRestrictions" value={data.foodRestrictions} onChange={cambiar}
            placeholder="Ej: Alérgico al maní..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones médicas</label>
          <input type="text" name="medicalConditions" value={data.medicalConditions} onChange={cambiar}
            placeholder="Ej: Asma, diabetes..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
          <input type="text" name="emergencyContact" value={data.emergencyContact} onChange={cambiar}
            placeholder="Nombre y teléfono"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del padre/tutor</label>
          <input type="text" name="guardianName" value={data.guardianName} onChange={cambiar}
            placeholder="Nombre completo"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea name="notes" value={data.notes} onChange={cambiar}
          placeholder="Observaciones adicionales..." rows={2}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition resize-none" />
      </div>
    </div>
  );
}

export default function FormParticipante({ participante, evento, onCancelar, onGuardado }) {
  const { userData, isNacional } = useAuth();
  const [guardando, setGuardando] = useState(false);

  const distritoInicial = !isNacional() ? (userData?.distrito || userData?.district || '') : '';
  const regionInicial = !isNacional() ? userData?.region || '' : '';
  const churchInicial = participante?.church || '';

  const [participantes, setParticipantes] = useState(() => {
    if (participante && participante.id) {
      return [{ ...participante }];
    }
    return [formularioVacio(distritoInicial, regionInicial, churchInicial)];
  });
  useEffect(() => {
    if (!isNacional() && userData?.distrito && !participante?.id) {
      setParticipantes(prev => {
        if (prev.length > 0 && !prev[0].district) {
          const nuevos = [...prev];
          nuevos[0] = { ...nuevos[0], district: userData.distrito };
          return nuevos;
        }
        return prev;
      });
    }
  }, [userData]);

  const actualizarParticipante = (index, nuevosDatos) => {
    setParticipantes(prev => {
      const nuevos = [...prev];
      nuevos[index] = nuevosDatos;
      if (index === 0 && nuevos.length > 1) {
        for (let i = 1; i < nuevos.length; i++) {
          nuevos[i] = {
            ...nuevos[i],
            church: nuevosDatos.church,
            district: nuevosDatos.district,
            region: nuevosDatos.region,
          };
        }
      }
      return nuevos;
    });
  };

  const agregarAcompanante = () => {
    const principal = participantes[0];
    setParticipantes(prev => [
      ...prev,
      formularioVacio(principal.district, principal.region, principal.church)
    ]);
  };

  const quitarAcompanante = (index) => {
    setParticipantes(prev => prev.filter((_, i) => i !== index));
  };

  const validar = () => {
    for (let i = 0; i < participantes.length; i++) {
      const p = participantes[i];
      if (!p.fullName?.trim()) {
        Swal.fire({ icon: 'warning', title: `Participante ${i + 1}`, text: 'El nombre es obligatorio.', confirmButtonColor: '#1e3a8a' });
        return false;
      }
      if (!p.gender) {
        Swal.fire({ icon: 'warning', title: `Participante ${i + 1}`, text: 'El género es obligatorio.', confirmButtonColor: '#1e3a8a' });
        return false;
      }
    }
    if (!participantes[0].church?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Iglesia requerida', text: 'La iglesia es obligatoria.', confirmButtonColor: '#1e3a8a' });
      return false;
    }
    if (!participantes[0].district?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Distrito requerido', text: 'El distrito es obligatorio.', confirmButtonColor: '#1e3a8a' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);

    try {
      if (participante && participante.id) {
        // Editar participante existente
        const datos = {
          ...participantes[0],
          fullName: participantes[0].fullName.trim(),
          church: participantes[0].church.trim(),
          district: participantes[0].district.trim(),
          region: participantes[0].region?.trim() || '',
          age: participantes[0].age ? Number(participantes[0].age) : null,
          updatedAt: serverTimestamp(),
          updatedBy: userData.uid
        };
        await updateDoc(doc(db, 'participants', participante.id), datos);
        Swal.fire({ icon: 'success', title: 'Participante actualizado', timer: 1500, showConfirmButton: false });
        onGuardado();
      } else {
        // Registrar nuevo participante o grupo familiar
        const grupoFamiliarId = generarGrupoId();
        const registrados = [];

        let numeroBase = await generarNumeroRegistro(evento.id);

        for (const p of participantes) {
        const registrationNumber = numeroBase;
            numeroBase++;
          const datos = {
            ...p,
            fullName: p.fullName.trim(),
            church: participantes[0].church.trim(),
            district: participantes[0].district.trim(),
            region: participantes[0].region?.trim() || '',
            age: p.age ? Number(p.age) : null,
            eventId: evento.id,
            eventName: evento.name,
            paymentStatus: 'pending',
            amountPaid: 0,
            grupoFamiliarId,
            registrationNumber,
            checkedIn: false,
            createdAt: serverTimestamp(),
            createdBy: userData.uid
          };
          await addDoc(collection(db, 'participants'), datos);
          registrados.push({ nombre: p.fullName, numero: registrationNumber });
        }

        const mensaje = registrados.length === 1
          ? `Registro #${registrados[0].numero}`
          : `${registrados.length} participantes registrados`;

        Swal.fire({
          icon: 'success',
          title: '✅ Registro completado',
          text: mensaje,
          confirmButtonColor: '#1e3a8a'
        });
        onGuardado();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const esEdicion = participante && participante.id;

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
            {esEdicion ? 'Editar Participante' : 'Nuevo Registro'}
          </h1>
          <p className="text-gray-500 text-sm">{evento.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {participantes.map((p, index) => (
          <SubFormulario
            key={index}
            index={index}
            data={p}
            onChange={actualizarParticipante}
            onRemove={quitarAcompanante}
            isNacional={isNacional()}
            userData={userData}
            showRemove={index > 0}
          />
        ))}

        {!esEdicion && (
          <button type="button" onClick={agregarAcompanante}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary-300 text-primary-700 hover:bg-primary-50 transition font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Agregar acompañante
          </button>
        )}

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
            ) : esEdicion ? 'Guardar cambios' : `Registrar ${participantes.length > 1 ? `${participantes.length} participantes` : 'participante'}`}
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