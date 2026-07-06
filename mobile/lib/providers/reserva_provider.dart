import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/reserva.dart';
import '../repositories/reserva_repository.dart';

final reservaRepositoryProvider = Provider<ReservaRepository>((ref) {
  return ReservaRepository();
});

final misReservasProvider = FutureProvider<List<Reserva>>((ref) async {
  final repo = ref.watch(reservaRepositoryProvider);
  return repo.obtenerMisReservas();
});

class ReservaAccionState {
  final bool isLoading;
  final String? error;
  final Reserva? ultimaReserva;

  const ReservaAccionState({
    this.isLoading = false,
    this.error,
    this.ultimaReserva,
  });

  ReservaAccionState copyWith({
    bool? isLoading,
    String? error,
    Reserva? ultimaReserva,
    bool clearError = false,
  }) {
    return ReservaAccionState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
      ultimaReserva: ultimaReserva ?? this.ultimaReserva,
    );
  }
}

class ReservaNotifier extends StateNotifier<ReservaAccionState> {
  final ReservaRepository _repo;
  final Ref _ref;

  ReservaNotifier(this._repo, this._ref) : super(const ReservaAccionState());

  Future<bool> crearReserva(
    String instalacionId,
    String fecha,
    String horaInicio,
    String horaFin,
  ) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final reserva =
          await _repo.crearReserva(instalacionId, fecha, horaInicio, horaFin);
      state = state.copyWith(isLoading: false, ultimaReserva: reserva);
      _ref.invalidate(misReservasProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> cancelarReserva(String reservaId) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.cancelarReserva(reservaId);
      state = state.copyWith(isLoading: false);
      _ref.invalidate(misReservasProvider);
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

final reservaNotifierProvider =
    StateNotifierProvider<ReservaNotifier, ReservaAccionState>((ref) {
  return ReservaNotifier(ref.watch(reservaRepositoryProvider), ref);
});
