# BLOQUE 1 — Base del Proyecto (Estructura + Firebase + Login con Roles)

Este es el primer bloque de la app "Convención Nacional de Niños".
Sigue estos pasos EN ORDEN.

---

## PASO 1: Crear el proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Crea un proyecto nuevo (ejemplo: "convencion-ninos")
3. Dentro del proyecto:
   - **Authentication** → Sign-in method → Habilita "Correo electrónico/Contraseña"
   - **Firestore Database** → Crear base de datos → Modo producción → elige la región más cercana (ej. us-central)
   - **Storage** → Crear (lo usaremos en bloques posteriores para fotos/QRs)

4. Ve a Configuración del proyecto (ícono de engranaje) → General → "Tus apps" → Agregar app → ícono Web (</>)
   - Ponle un nombre (ej. "convencion-web")
   - NO marques Firebase Hosting (usaremos Netlify)
   - Copia el objeto `firebaseConfig` que te aparece, se ve así:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "convencion-ninos.firebaseapp.com",
  projectId: "convencion-ninos",
  storageBucket: "convencion-ninos.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. Abre el archivo `src/firebase/config.js` que te entregué y **reemplaza** los valores de `firebaseConfig` con los tuyos.

---

## PASO 2: Crear tu primer usuario administrador

1. En Firebase Console → Authentication → Users → "Agregar usuario"
   - Correo: tu correo (ej. admin@convencion.com)
   - Contraseña: la que quieras
   - Después de crearlo, **copia el "User UID"** que aparece (es un código largo).

2. En Firebase Console → Firestore Database → "Iniciar colección"
   - ID de la colección: `users`
   - ID del documento: pega el **User UID** que copiaste
   - Agrega estos campos:

| Campo    | Tipo     | Valor                          |
|----------|----------|--------------------------------|
| nombre   | string   | Tu nombre completo              |
| email    | string   | tu correo (el mismo del login)  |
| rol      | string   | `nacional`                      |
| region   | string   | (déjalo vacío o no lo agregues) |
| distrito | string   | (déjalo vacío o no lo agregues) |
| activo   | boolean  | `true`                          |

Esto te da acceso como **Administrador Nacional** (acceso total).

---

## PASO 3: Instalar el proyecto en tu computadora

1. Descomprime la carpeta del proyecto en tu computadora.
2. Abre la carpeta en VSCode.
3. Abre una terminal en VSCode (Terminal → Nueva Terminal) y ejecuta:

```bash
npm install
```

Esto puede tardar 1-2 minutos.

4. Para probar la app localmente, ejecuta:

```bash
npm run dev
```

5. Abre el navegador en la dirección que aparece (normalmente `http://localhost:5173`)

6. Inicia sesión con el correo y contraseña que creaste en el Paso 2.

Si todo está bien configurado, deberías ver el Dashboard con el sidebar de navegación.

---

## PASO 4: Configurar las reglas de seguridad de Firestore

1. En Firebase Console → Firestore Database → pestaña "Reglas"
2. Borra todo el contenido que aparece
3. Copia y pega el contenido completo del archivo `firestore.rules` que te entregué
4. Click en "Publicar"

⚠️ Sin este paso, la app no podrá leer ni escribir datos correctamente.

---

## PASO 5: Subir a GitHub y desplegar en Netlify

1. Crea un repositorio nuevo en GitHub (ej. "convencion-ninos") y sube el código:

```bash
git init
git add .
git commit -m "Bloque 1: estructura base, Firebase, login con roles"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/convencion-ninos.git
git push -u origin main
```

2. Ve a https://app.netlify.com → "Add new site" → "Import an existing project"
3. Conecta tu repositorio de GitHub
4. Configuración de build (Netlify la detecta automáticamente con `netlify.toml`, pero verifica):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click en "Deploy"

Cuando termine, te dará una URL pública (ej. `https://convencion-ninos.netlify.app`) donde la app ya estará en línea.

---

## ESTRUCTURA DE ARCHIVOS ENTREGADA EN ESTE BLOQUE

```
convencion-ninos/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml
├── firestore.rules
├── .gitignore
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── firebase/
    │   └── config.js          ← AQUÍ PEGAS TUS DATOS DE FIREBASE
    ├── context/
    │   ├── AuthContext.jsx     ← Lógica de login y roles
    │   └── EventContext.jsx    ← Evento activo seleccionado
    ├── components/
    │   └── ProtectedRoute.jsx  ← Protege rutas según login/rol
    ├── layouts/
    │   └── MainLayout.jsx      ← Sidebar + selector de evento
    └── pages/
        ├── Login.jsx
        └── Dashboard.jsx        (placeholder, se completa después)
```

---

## QUÉ SIGUE (PRÓXIMOS BLOQUES)

- **Bloque 2**: Módulo de Eventos (crear/editar/cerrar convenciones)
- **Bloque 3**: Módulo de Participantes (registro, búsqueda, filtros)
- **Bloque 4**: Módulo de Pagos
- **Bloque 5**: Hospedaje
- **Bloque 6**: Grupos de Niños
- **Bloque 7**: Camisetas
- **Bloque 8**: Credenciales QR
- **Bloque 9**: Check-In
- **Bloque 10**: Reportes
- **Bloque 11**: Dashboard completo con estadísticas
- **Bloque 12**: Módulo de Usuarios (gestión de roles)

Cada bloque vendrá con sus archivos completos e instrucciones de dónde colocarlos
(la mayoría dentro de `src/features/<nombre-del-modulo>/`).

---

## NOTA IMPORTANTE

Por ahora, en el menú lateral verás "Eventos", "Participantes", "Pagos", etc.
pero al hacer clic mostrarán "🚧 Módulo en construcción" — esto es normal,
los iremos llenando bloque por bloque.

Cuando quieras continuar, dime: **"Bloque 2"** o el módulo que prefieras hacer primero.
