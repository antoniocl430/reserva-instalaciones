import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/lista_espera.dart';
import '../models/reserva.dart';
import '../repositories/lista_espera_repository.dart';
import 'reserva_provider.dart';

final listaEsperaRepositoryProvider = Provider<ListaEsperaRepository>((ref) {
  return ListaEsperaRepository();
});

final listaEsperaProvider = FutureProvider<List<ListaEspera>>((ref) async {
  final repo = ref.watch(listaEsperaRepositoryProvider);
  return repo.obtenerListaEspera();
});

class ListaEsperaAccionState {
  final bool isLoading;
  final String? error;

  const ListaEsperaAccionState({this.isLoading = false, this.error});

  ListaEsperaAccionState copyWith(
      {bool? isLoading, String? error, bool clearError = false}) {
    return ListaEsperaAccionState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
    );
  }
}

class ListaEsperaNotifier extends StateNotifier<ListaEsperaAccionState> {
  final ListaEsperaRepository _repo;
  final Ref _ref;

  ListaEsperaNotifier(this._repo, this._ref)
      : super(const ListaEsperaAccionState());

  Future<bool> unirse(
      String instalacionId, String fecha, String horaInicio) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.unirseListaEspera(instalacionId, fecha, horaInicio);
      state = state.copyWith(isLoading: false);
      _ref.invalidate(listaEsperaProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> abandonar(String id) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.abandonarListaEspera(id);
      state = state.copyWith(isLoading: false);
      _ref.invalidate(listaEsperaProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  Future<Reserva?> confirmarTurno(String id) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final reserva = await _repo.confirmarTurno(id);
      state = state.copyWith(isLoading: false);
      _ref.invalidate(listaEsperaProvider);
      _ref.invalidate(misReservasProvider);
      return reserva;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return null;
    }
  }
}

final listaEsperaNotifierProvider =
    StateNotifierProvider<ListaEsperaNotifier, ListaEsperaAccionState>((ref) {
  return ListaEsperaNotifier(ref.watch(listaEsperaRepositoryProvider), ref);
});
