import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/registro_screen.dart';
import '../screens/auth/recuperar_password_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/instalaciones/instalacion_detalle_screen.dart';
import '../screens/reservas/mis_reservas_screen.dart';
import '../screens/asistencia/verificar_qr_screen.dart';
import '../screens/valoracion/valorar_screen.dart';
import '../screens/perfil/perfil_screen.dart';
import '../screens/perfil/editar_perfil_screen.dart';
import '../screens/lista_espera/lista_espera_screen.dart';
import '../models/instalacion.dart';
import '../models/reserva.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;

      if (isLoading) return null;

      const publicRoutes = [
        '/login',
        '/registro',
        '/recuperar-password',
        '/',
      ];

      if (!isAuthenticated && !publicRoutes.contains(state.matchedLocation)) {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/registro',
        builder: (context, state) => const RegistroScreen(),
      ),
      GoRoute(
        path: '/recuperar-password',
        builder: (context, state) => const RecuperarPasswordScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/instalacion/:id',
        builder: (context, state) {
          // Se puede navegar con el objeto Instalacion como extra
          final extra = state.extra;
          if (extra is Instalacion) {
            return InstalacionDetalleScreen(instalacion: extra);
          }
          // Fallback: construir placeholder con el id disponible
          final id = state.pathParameters['id']!;
          return InstalacionDetalleScreen(
            instalacion: Instalacion(
              id: id,
              nombre: 'Instalación',
              tipo: '',
              activa: true,
            ),
          );
        },
      ),
      GoRoute(
        path: '/mis-reservas',
        builder: (context, state) => const MisReservasScreen(),
      ),
      GoRoute(
        path: '/verificar-qr',
        builder: (context, state) => const VerificarQrScreen(),
      ),
      GoRoute(
        path: '/valorar/:reservaId',
        builder: (context, state) {
          final reservaId = state.pathParameters['reservaId']!;
          final reserva = state.extra is Reserva ? state.extra as Reserva : null;
          return ValorarScreen(
            reservaId: reservaId,
            reserva: reserva,
          );
        },
      ),
      GoRoute(
        path: '/perfil',
        builder: (context, state) => const PerfilScreen(),
      ),
      GoRoute(
        path: '/editar-perfil',
        builder: (context, state) => const EditarPerfilScreen(),
      ),
      GoRoute(
        path: '/lista-espera',
        builder: (context, state) => const ListaEsperaScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text(
              'Página no encontrada',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => context.go('/'),
              child: const Text('Volver al inicio'),
            ),
          ],
        ),
      ),
    ),
  );
});
