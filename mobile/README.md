# Reserva Instalaciones — App Móvil

App Flutter para ciudadanos del sistema de reservas de instalaciones deportivas municipales.

---

## Requisitos previos

### 1. Instalar Flutter

Sigue la guía oficial: https://docs.flutter.dev/get-started/install

Verifica la instalación:
```bash
flutter doctor
```

### 2. Instalar Android Studio

Descarga desde: https://developer.android.com/studio

Dentro de Android Studio:
- Ve a **SDK Manager** → SDK Tools
- Instala **Android SDK Command-line Tools** y **Android Emulator**

Crea un dispositivo virtual (AVD):
- Ve a **Device Manager** → Create device
- Selecciona un teléfono (ej. Pixel 6) con API 33 o superior

---

## Ejecutar la app

```bash
# Instalar dependencias
flutter pub get

# Ejecutar en modo debug (con emulador Android abierto)
flutter run

# Ejecutar en un dispositivo específico
flutter devices          # lista dispositivos disponibles
flutter run -d <id>      # lanza en ese dispositivo
```

---

## Configurar la URL del backend

Edita el archivo `lib/core/constants.dart`:

```dart
class AppConstants {
  // Cambia esta URL por la de tu servidor
  static const String apiBaseUrl = 'http://10.0.2.2:3000';
  // ...
}
```

- `http://10.0.2.2:3000` → localhost desde el emulador Android
- `http://192.168.x.x:3000` → IP de tu máquina en la red local (para dispositivo físico)
- `https://api.tudominio.com` → URL de producción

---

## Generar APK para producción

```bash
flutter build apk --release
```

El archivo se genera en: `build/app/outputs/flutter-apk/app-release.apk`

Para generar un APK por ABI (más pequeño):
```bash
flutter build apk --split-per-abi --release
```

---

## Estructura del proyecto

```
lib/
├── core/           # Configuración global (router, tema, cliente HTTP)
├── models/         # Modelos de datos (Usuario, Reserva, etc.)
├── repositories/   # Acceso a la API REST
├── providers/      # Estado con Riverpod
├── screens/        # Pantallas de la app
│   ├── auth/       # Login, registro, recuperar contraseña
│   ├── home/       # Pantalla principal
│   ├── instalaciones/
│   ├── reservas/
│   ├── lista_espera/
│   ├── perfil/
│   └── valoracion/
└── widgets/        # Componentes reutilizables
```
