import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export const ROLES = {
  NACIONAL: 'nacional',
  DISTRITAL: 'distrital',
  VIEWER: 'viewer'
};

// Módulos que puede ver un distrital
export const MODULOS_DISTRITAL = [
  '/participantes',
  '/pagos',
  '/hospedaje',
  '/grupos',
  '/credenciales',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUser(firebaseUser);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: data.nombre || '',
              rol: data.rol || ROLES.VIEWER,
              region: data.region || null,
              distrito: data.distrito || null,
              activo: data.activo !== false
            });
          } else {
            setUser(firebaseUser);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: '',
              rol: null,
              region: null,
              distrito: null,
              activo: false
            });
          }
        } catch (error) {
          console.error('Error cargando datos del usuario:', error);
          setUser(firebaseUser);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Esperar a que se cargue el perfil del usuario
    await new Promise(resolve => setTimeout(resolve, 500));
    return result;
  };

  const logout = async () => {
    return signOut(auth);
  };

  const isNacional = () => userData?.rol === ROLES.NACIONAL;
  const isDistrital = () => userData?.rol === ROLES.DISTRITAL;
  const isViewer = () => userData?.rol === ROLES.VIEWER;

  // Nacional puede editar todo
  // Distrital puede editar solo sus módulos permitidos
  const canEdit = () => userData?.rol === ROLES.NACIONAL || userData?.rol === ROLES.DISTRITAL;

  // ¿Puede acceder a un módulo específico?
  const canAccessModulo = (path) => {
    if (isNacional()) return true;
    if (isDistrital()) return MODULOS_DISTRITAL.includes(path);
    return false;
  };

  // ¿Puede ver datos de un distrito específico?
  const canAccessDistrito = (distrito) => {
    if (isNacional()) return true;
    if (isDistrital()) return userData?.distrito === distrito;
    return false;
  };

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    isNacional,
    isDistrital,
    isViewer,
    canEdit,
    canAccessModulo,
    canAccessDistrito,
    MODULOS_DISTRITAL
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}