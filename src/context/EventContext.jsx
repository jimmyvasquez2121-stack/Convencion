import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [eventos, setEventos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventos(lista);

      setEventoActivo((prev) => {
        if (prev) {
          const sigueExistiendo = lista.find((e) => e.id === prev.id);
          if (sigueExistiendo) return sigueExistiendo;
        }

        try {
          const guardadoId = localStorage.getItem('eventoActivoId');
          if (guardadoId) {
            const evento = lista.find((e) => e.id === guardadoId);
            if (evento) return evento;
          }
        } catch (e) {}

        const abierto = lista.find((e) => e.status === 'Open');
        return abierto || lista[0] || null;
      });

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const seleccionarEvento = (eventoId) => {
    const evento = eventos.find((e) => e.id === eventoId);
    if (evento) {
      setEventoActivo(evento);
      try {
        localStorage.setItem('eventoActivoId', eventoId);
      } catch (e) {}
    }
  };

  const value = {
    eventos,
    eventoActivo,
    seleccionarEvento,
    loading
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent debe usarse dentro de un EventProvider');
  }
  return context;
}