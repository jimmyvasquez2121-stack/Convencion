import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import * as XLSX from 'xlsx';

const TALLAS_NINOS = ['2', '4', '6', '8', '10', '12', '14', '16'];
const TALLAS_ADULTOS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TODAS_TALLAS = [...TALLAS_NINOS, ...TALLAS_ADULTOS];

export default function Camisetas() {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('resumen');
  const { eventoActivo } = useEvent();

  useEffect(() => {
    if (!eventoActivo) { setParticipantes([]); setLoading(false); return; }
    const q = query(collection(db, 'participants'), where('eventId', '==', eventoActivo.id));
    const unsub = onSnapshot(q, (snap) => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  const conteoTallas = TODAS_TALLAS.reduce((acc, talla) => {
    acc[talla] = participantes.filter(p => p.tshirtSize === talla).length;
    return acc;
  }, {});

  const totalConTalla = participantes.filter(p => p.tshirtSize).length;
  const totalSinTalla = participantes.filter(p => !p.tshirtSize).length;

  const porDistrito = participantes.reduce((acc, p) => {
    if (!p.tshirtSize) return acc;
    const distrito = p.district || 'Sin distrito';
    if (!acc[distrito]) { acc[distrito] = { total: 0 }; TODAS_TALLAS.forEach(t => { acc[distrito][t] = 0; }); }
    acc[distrito][p.tshirtSize] = (acc[distrito][p.tshirtSize] || 0) + 1;
    acc[distrito].total += 1;
    return acc;
  }, {});

  const porRegion = participantes.reduce((acc, p) => {
    if (!p.tshirtSize) return acc;
    const region = p.region || 'Sin región';
    if (!acc[region]) { acc[region] = { total: 0 }; TODAS_TALLAS.forEach(t => { acc[region][t] = 0; }); }
    acc[region][p.tshirtSize] = (acc[region][p.tshirtSize] || 0) + 1;
    acc[region].total += 1;
    return acc;
  }, {});

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const resumenData = [['Talla', 'Cantidad'], ...TODAS_TALLAS.map(t => [t, conteoTallas[t] || 0]), ['TOTAL', totalConTalla]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');
    const distritoHeaders = ['Distrito', ...TODAS_TALLAS, 'Total'];
    const distritoData = [distritoHeaders, ...Object.entries(porDistrito).map(([d, datos]) => [d, ...TODAS_TALLAS.map(t => datos[t] || 0), datos.total])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(distritoData), 'Por Distrito');
    const listadoData = [['#', 'Nombre', 'Tipo', 'Iglesia', 'Distrito', 'Región', 'Talla'],
      ...participantes.map((p, i) => [i + 1, p.fullName, p.participantType, p.church, p.district, p.region, p.tshirtSize || 'Sin talla'])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(listadoData), 'Listado');
    XLSX.writeFile(wb, `Camisetas_${eventoActivo.name}.xlsx`);
  };

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Camisetas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name}</p>
        </div>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-800">{participantes.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total participantes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalConTalla}</p>
          <p className="text-gray-500 text-xs mt-1">Con talla</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{totalSinTalla}</p>
          <p className="text-gray-500 text-xs mt-1">Sin talla</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {[
          { id: 'resumen', label: 'Resumen' },
          { id: 'distrito', label: 'Por Distrito' },
          { id: 'region', label: 'Por Región' },
          { id: 'listado', label: 'Listado' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setVistaActiva(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px
              ${vistaActiva === tab.id ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {vistaActiva === 'resumen' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Tallas de Niños</h2>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {TALLAS_NINOS.map(talla => (
                    <div key={talla} className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-2xl font-bold text-blue-700">{conteoTallas[talla] || 0}</p>
                      <p className="text-xs text-blue-500 font-medium mt-1">T.{talla}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Tallas de Adultos</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {TALLAS_ADULTOS.map(talla => (
                    <div key={talla} className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-2xl font-bold text-purple-700">{conteoTallas[talla] || 0}</p>
                      <p className="text-xs text-purple-500 font-medium mt-1">{talla}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {vistaActiva === 'distrito' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Distrito</th>
                      {TODAS_TALLAS.map(t => <th key={t} className="text-center px-2 py-3 font-semibold text-gray-600">{t}</th>)}
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(porDistrito).map(([distrito, datos]) => (
                      <tr key={distrito} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{distrito}</td>
                        {TODAS_TALLAS.map(t => (
                          <td key={t} className="text-center px-2 py-3">
                            {datos[t] > 0 ? <span className="font-semibold text-primary-700">{datos[t]}</span> : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="text-center px-4 py-3 font-bold text-gray-800">{datos.total}</td>
                      </tr>
                    ))}
                    {Object.keys(porDistrito).length === 0 && (
                      <tr><td colSpan={TODAS_TALLAS.length + 2} className="text-center py-8 text-gray-400">No hay datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vistaActiva === 'region' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Región</th>
                      {TODAS_TALLAS.map(t => <th key={t} className="text-center px-2 py-3 font-semibold text-gray-600">{t}</th>)}
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(porRegion).map(([region, datos]) => (
                      <tr key={region} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{region}</td>
                        {TODAS_TALLAS.map(t => (
                          <td key={t} className="text-center px-2 py-3">
                            {datos[t] > 0 ? <span className="font-semibold text-primary-700">{datos[t]}</span> : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="text-center px-4 py-3 font-bold text-gray-800">{datos.total}</td>
                      </tr>
                    ))}
                    {Object.keys(porRegion).length === 0 && (
                      <tr><td colSpan={TODAS_TALLAS.length + 2} className="text-center py-8 text-gray-400">No hay datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vistaActiva === 'listado' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Distrito</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Talla</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {participantes.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.registrationNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.fullName}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.participantType}</td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.district}</td>
                        <td className="px-4 py-3">
                          {p.tshirtSize
                            ? <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-lg text-xs">{p.tshirtSize}</span>
                            : <span className="text-red-400 text-xs">Sin talla</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}