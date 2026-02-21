# 🐾 Cartilla Veterinaria

Una aplicación web moderna y completa para gestionar la salud y el bienestar de tus mascotas. Diseñada como una cartilla digital, permite llevar un seguimiento exhaustivo de vacunas, historiales médicos y clínicas veterinarias favoritas.

![Cartilla Veterinaria Dashboard](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## ✨ Características Principales

### 🐕 Gestión de Mascotas
- Registro detallado de múltiples mascotas (perros, gatos, conejos, aves, etc.).
- Seguimiento de estado de salud, peso, edad y raza.
- Fotos personalizadas para cada perfil.

### 💉 Control de Vacunación
- **Presets para España**: Listado predefinido de vacunas obligatorias y recomendadas según la especie.
- Recordatorios automáticos de próximas dosis.
- Clasificación visual (🛡️ Obligatorias / 💉 Recomendadas).

### 📋 Historial Médico y Adjuntos
- Registro completo de consultas, pruebas y tratamientos.
- **Soporte multi-adjunto**: Sube y visualiza informes PDF, radiografías e imágenes directamente en cada registro.
- Almacenamiento seguro en la nube.

### 📍 Gestión de Clínicas
- **Buscador Inteligente**: Localiza clínicas veternarias cercanas usando GPS e integración con mapas.
- **Mis Clínicas**: Guarda tus centros de confianza, asócialos a tus mascotas y contacta con ellos rápidamente (teléfono, web, ubicación).
- Búsqueda avanzada por nombre o calle.
- Añadido manual de clínicas no listadas.

### 📅 Agenda y Recordatorios
- Calendario integrado para citas y vacunaciones pendientes.
- Notificaciones visuales de vacunas próximas o caducadas.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19 (Vite), TypeScript.
- **Estilos**: Tailwind CSS 4.0, Lucide React (iconos), Framer Motion (animaciones).
- **Backend / Base de Datos**: Firebase Firestore.
- **Autenticación**: Firebase Auth.
- **Almacenamiento**: Firebase Storage.
- **Mapas**: Leaflet / React Leaflet.

---

## 🚀 Instalación y Uso Local

### Requisitos previos
- Node.js (v18 o superior)
- Una cuenta de Firebase (con Firestore, Auth y Storage habilitados)

### Paso a paso

1. **Clonar el proyecto** e instalar dependencias:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env.local` en la raíz (puedes usar `.env.example` como base) y añade tus credenciales de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_dominio.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

3. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

---

## ⚖️ Licencia
Este proyecto es privado. Todos los derechos reservados.
