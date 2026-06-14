import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

export default function DetalleGrupo({ grupo, evento, colores, onVolver, onEditar }) {
  const [miembros, setMiembros] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showBuscar, setShowBuscar] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [memberCount, setMemberCount] = useState(grupo.memberCount || 0);
  const { userData, canEdit } = useAuth();

  const color = colores.find(c => c.name === grupo.color) || colores[0];

  useEffect(() => {
    const q = query(collection(db, 'groupMembers'), where('groupId', '==', grupo.id));
    const unsub = onSnapshot(q, (snap) => {
      setMiembros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [grupo.id]);

  useEffect(() => {
    if (!showBuscar) return;
    const q = query(
      collection(db, 'participants'),
      where('eventId', '==', evento.id),
      orderBy('registrationNumber', 'asc')
    );
    getDocs(q).then(snap => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [showBuscar, evento.id]);

  const asignarMiembro = async (participante) => {
    const yaAsignado = miembros.find(m => m.participantId === participante.id);
    if (yaAsignado) {
      Swal.fire({ icon: 'warning', title: 'Ya asignado', text: 'Este participante ya está en este grupo.', confirmButtonColor: '#1e3a8a' });
      return;
    }
    setAsignando(true);
    try {
      await addDoc(collection(db, 'groupMembers'), {
        groupId: grupo.id, groupName: grupo.name,
        participantId: participante.id, participantName: participante.fullName,
        registrationNumber: participante.registrationNumber,
        participantType: participante.participantType,
        eventId: evento.id, assignedAt: serverTimestamp(), assignedBy: userData.uid
      });
      const nuevoCount = memberCount + 1;
      await updateDoc(doc(db, 'groups', grupo.id), { memberCount: nuevoCount });
      setMemberCount(nuevoCount);
      setBusqueda('');
      setShowBuscar(false);
      Swal.fire({ icon: 'success', title: 'Miembro agregado', timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setAsignando(false);
    }
  };

  const removerMiembro = async (miembro) => {
    const result = await Swal.fire({
      title: '¿Remover miembro?', text: `¿Remover a "${miembro.participantName}" del grupo?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, remover',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'groupMembers', miembro.id));
        const nuevoCount = Math.max(memberCount - 1, 0);
        await updateDoc(doc(db, 'groups', grupo.id), { memberCount: nuevoCount });
        setMemberCount(nuevoCount);
        Swal.fire({ icon: 'success', title: 'Miembro removido', timer: 1200, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const participantesFiltrados = participantes.filter(p => {
    const texto = busqueda.toLowerCase();
    return !busqueda ||
      p.fullName?.toLowerCase().includes(texto) ||
      p.registrationNumber?.toString().includes(texto) ||
      p.church?.toLowerCase().includes(texto);
  });

  const handlePrint = () => {
    const contenido = `
      <html><head><title>Grupo ${grupo.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1e3a8a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>
      <h1>Grupo: ${grupo.name}</h1>
      <p>Maestro: ${grupo.teacher || '—'} | Líder: ${grupo.leader || '—'} | Total: ${memberCount}</p>
      <table><tr><th>#</th><th>Nombre</th><th>Registro</th><th>Tipo</th></tr>
      ${miembros.map((m, i) => `<tr><td>${i + 1}</td><td>${m.participantName}</td><td>#${m.registrationNumber}</td><td>${m.participantType || '—'}</td></tr>`).join('')}
      </table></body></html>
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
          <div className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-full ${color.bg}`} />
            <h1 className="text-2xl font-bold text-gray-800">{grupo.name}</h1>
          </div>
          <p className="text-gray-500 text-sm">Color: {grupo.color} — {memberCount} miembros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          {canEdit() && (
            <button onClick={onEditar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className={`h-1 w-full ${color.bg} rounded-full mb-4`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-400 text-xs font-semibold uppercase">Maestro</p><p className="font-medium text-gray-700 mt-1">{grupo.teacher || '—'}</p></div>
          <div><p className="text-gray-400 text-xs font-semibold uppercase">Líder</p><p className="font-medium text-gray-700 mt-1">{grupo.leader || '—'}</p></div>
          <div><p className="text-gray-400 text-xs font-semibold uppercase">Miembros</p><p className="font-bold text-2xl text-gray-800 mt-1">{memberCount}</p></div>
          <div><p className="text-gray-400 text-xs font-semibold uppercase">Capacidad</p><p className="font-medium text-gray-700 mt-1">{grupo.capacity || 'Sin límite'}</p></div>
        </div>
      </div>

      {canEdit() && (
        <div className="mb-4">
          <button onClick={() => setShowBuscar(!showBuscar)}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Miembro
          </button>
        </div>
      )}

      {showBuscar && (
        <div className="bg-white rounded-xl border border-primary-200 p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Buscar participante:</p>
          <input type="text" placeholder="Nombre, número de registro, iglesia..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition text-sm mb-3"
            autoFocus />
          {busqueda && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {participantesFiltrados.slice(0, 10).map(p => {
                const yaAsignado = miembros.find(m => m.participantId === p.id);
                return (
                  <div key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${yaAsignado ? 'bg-gray-50 opacity-50' : 'hover:bg-primary-50 cursor-pointer'}`}
                    onClick={() => !yaAsignado && !asignando && asignarMiembro(p)}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.fullName}</p>
                      <p className="text-xs text-gray-400">#{p.registrationNumber} — {p.participantType}</p>
                    </div>
                    {yaAsignado
                      ? <span className="text-xs text-gray-400">Ya en grupo</span>
                      : <span className="text-xs text-primary-600 font-medium">Agregar</span>}
                  </div>
                );
              })}
              {participantesFiltrados.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-2">No se encontraron participantes</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Miembros del Grupo ({memberCount})</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <svg className="animate-spin h-6 w-6 text-primary-800" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : miembros.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No hay miembros en este grupo todavía</p>
        ) : (
          <div className="space-y-2">
            {miembros.map((m, index) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full ${color.bg} text-white text-xs font-bold flex items-center justify-center`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{m.participantName}</p>
                    <p className="text-xs text-gray-400">#{m.registrationNumber} — {m.participantType}</p>
                  </div>
                </div>
                {canEdit() && (
                  <button onClick={() => removerMiembro(m)} className="text-red-400 hover:text-red-600 transition p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}