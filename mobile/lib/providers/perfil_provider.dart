import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/usuario.dart';
import '../repositories/perfil_repository.dart';
import 'auth_provider.dart';

final perfilRepositoryProvider = Provider<PerfilRepository>((ref) {
  return PerfilRepository();
});

final perfilProvider = FutureProvider<Usuario>((ref) async {
  final repo = ref.watch(perfilRepositoryProvider);
  return repo.obtenerPerfil();
});

class PerfilAccionState {
  final bool isLoading;
  final String? error;
  final String? mensajeExito;

  const PerfilAccionState({
    this.isLoading = false,
    this.error,
    this.mensajeExito,
  });

  PerfilAccionState copyWith({
    bool? isLoading,
    String? error,
    String? mensajeExito,
    bool clearError = false,
    bool clearMensaje = false,
  }) {
    return PerfilAccionState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
      mensajeExito: clearMensaje ? null : mensajeExito ?? this.mensajeExito,
    );
  }
}

class PerfilNotifier extends StateNotifier<PerfilAccionState> {
  final PerfilRepository _repo;
  final Ref _ref;

  PerfilNotifier(this._repo, this._ref) : super(const PerfilAccionState());

  Future<bool> actualizarNombre(String nombre) async {
    state = state.copyWith(isLoading: true, clearError: true, clearMensaje: true);
    try {
      final usuario = await _repo.actualizarNombre(nombre);
      _ref.read(authProvider.notifier).actualizarUsuario(usuario);
      _ref.invalidate(perfilProvider);
      state = state.copyWith(
          isLoading: false, mensajeExito: 'Nombre actualizado correctamente');
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> cambiarPassword(
      String passwordActual, String passwordNueva) async {
    state = state.copyWith(isLoading: true, clearError: true, clearMensaje: true);
    try {
      await _repo.cambiarPassword(passwordActual, passwordNueva);
      state = state.copyWith(
          isLoading: false,
          mensajeExito: 'Contraseña cambiada correctamente');
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }
}

final perfilNotifierProvider =
    StateNotifierProvider<PerfilNotifier, PerfilAccionState>((ref) {
  return PerfilNotifier(ref.watch(perfilRepositoryProvider), ref);
});
