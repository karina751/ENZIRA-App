# 👜 ENZIRA - Boutique de Alta Costura

**ENZIRA** es una plataforma de catálogo digital y gestión de ventas diseñada para dispositivos móviles y web.
El sistema permite a los clientes explorar colecciones exclusivas y coordinar compras vía WhatsApp, 
mientras que ofrece a la administración un panel centralizado para la gestión de stock y pedidos.

---

## 🛠️ Stack Tecnológico

El proyecto está construido sobre una arquitectura moderna y escalable:

* **Frontend:** [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 51).
* **UI Framework:** [React Native Paper](https://reactnativepaper.com/) (Material Design).
* **Backend as a Service:** [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage).
* **Media Management:** [Cloudinary](https://cloudinary.com/) (Optimización de imágenes en la nube).
* **Hosting & CI/CD:** [Vercel](https://vercel.com/) (Sincronizado con GitHub).

---

## 📂 Estructura del Proyecto

```text
├── assets/             # Iconos, splash y recursos visuales estáticos.
├── src/
│   ├── context/        # Manejo de estado global (CartContext).
│   ├── services/       # Configuraciones de Firebase y Cloudinary.
│   ├── screens/        # Pantallas (Home, Login, Admin, Cart, ProductDetail).
│   ├── navigation/     # Configuración de Drawer y Stack Navigation.
│   └── components/     # Componentes reutilizables.
├── app.json            # Manifiesto de Expo y permisos nativos.
└── firebase.ts         # Inicialización del SDK de Firebase.

🔐 Seguridad y Roles de Usuario
El sistema utiliza un modelo de Control de Acceso Basado en Roles (RBAC):

Clientes: Pueden navegar, registrarse y armar carritos.

Administrador (Mariel): Identificado por el campo rol: 'admin' en la colección usuarios.

Acceso exclusivo al panel de gestión (AdminScreen).

Permisos para carga, edición y borrado de productos.

⚙️ Configuración del Entorno (.env)
Para que el proyecto funcione localmente o en producción, se requieren las siguientes variables de entorno.

IMPORTANTE: En producción (Vercel), estas llaves deben cargarse en el panel de Environment Variables.

Fragmento de código
# Firebase Config
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Cloudinary Config
EXPO_PUBLIC_CLOUDINARY_URL=[https://api.cloudinary.com/v1_1/tu_cloud_name/image/upload](https://api.cloudinary.com/v1_1/tu_cloud_name/image/upload)
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tu_preset
🚀 Despliegue en Vercel
El deploy se realiza automáticamente al hacer push a la rama main. Configuraciones críticas en Vercel:

Build Command: npx expo export -p web

Output Directory: dist

Framework Preset: Other

📸 Gestión de Imágenes
Para mantener una base de datos liviana, las imágenes no se almacenan como Base64.

Se capturan con expo-image-picker.

Se envían a Cloudinary mediante un FormData.

Se almacena únicamente la URL pública resultante en Firestore.

📦 Scripts Disponibles
npm start: Inicia el entorno de desarrollo de Expo.

npm run web: Lanza la versión web local.

npx expo export -p web: Genera el build para producción.

desarrollado por Karina (Analista de Sistemas) para ENZIRA.
