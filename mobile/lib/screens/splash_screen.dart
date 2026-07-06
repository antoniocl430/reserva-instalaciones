import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/secure_storage.dart';
import '../core/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );
    _controller.forward();
    _comprobarAuth();
  }

  Future<void> _comprobarAuth() async {
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    // Si el almacenamiento seguro falla por cualquier motivo, tratamos al
    // usuario como no autenticado en lugar de dejar la splash colgada.
    String? token;
    try {
      token = await SecureStorage.instance.obtenerToken();
    } catch (_) {
      token = null;
    }

    if (!mounted) return;

    // Ayuntamiento fijo (Herrera): no hay selección de municipio.
    context.go(token != null ? '/home' : '/login');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primario,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.sports_soccer,
                  size: 60,
                  color: AppTheme.primario,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Reservas Deportivas',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Instalaciones municipales',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 48),
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                strokeWidth: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
