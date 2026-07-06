import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/dio_client.dart';
import '../core/secure_storage.dart';
import '../models/usuario.dart';
import '../repositories/auth_repository.dart';

class AuthState {
  final bool isLoading;
  final Usuario? usuario;
  final String? error;
  final String? tenantSlug;

  const AuthState({
    this.isLoading = false,
    this.usuario,
    this.error,
    this.tenantSlug,
  });

  bool get isAuthenticated => usuario != null;

  AuthState copyWith({
    bool? isLoading,
    Usuario? usuario,
    String? error,
    String? tenantSlug,
    bool clearUsuario = false,
    bool clearError = false,
    bool clearTenantSlug = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      usuario: clearUsuario ? null : usuario ?? this.usuario,
      error: clearError ? null : error ?? this.error,
      tenantSlug: clearTenantSlug ? null : tenantSlug ?? this.tenantSlug,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState()) {
    _inicializar();
  }

  Future<void> _inicializar() async {
    state = state.copyWith(isLoading: true);
    try {
      final slug = await SecureStorage.instance.obtenerTenantSlug();
      final usuario = await _repo.obtenerUsuarioGuardado();
      state = state.copyWith(
        isLoading: false,
        usuario: usuario,
        tenantSlug: slug,
      );
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final usuario = await _repo.login(email, password);
      final slug = await SecureStorage.instance.obtenerTenantSlug();
      state = state.copyWith(isLoading: false, usuario: usuario, tenantSlug: slug);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> registro(String nombre, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final usuario = await _repo.registro(nombre, email, password);
      final slug = await SecureStorage.instance.obtenerTenantSlug();
      state = state.copyWith(isLoading: false, usuario: usuario, tenantSlug: slug);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    DioClient.instance.reset();
    state = const AuthState();
  }

  void actualizarUsuario(Usuario usuario) {
    state = state.copyWith(usuario: usuario);
  }

  void establecerTenantSlug(String slug) {
    state = state.copyWith(tenantSlug: slug);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
