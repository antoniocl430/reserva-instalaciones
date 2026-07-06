import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/instalacion.dart';
import '../models/slot.dart';
import '../repositories/instalacion_repository.dart';

final instalacionRepositoryProvider = Provider<InstalacionRepository>((ref) {
  return InstalacionRepository();
});

final instalacionesProvider = FutureProvider<List<Instalacion>>((ref) async {
  final repo = ref.watch(instalacionRepositoryProvider);
  return repo.obtenerInstalaciones();
});

final disponibilidadProvider = FutureProvider.family<List<Slot>, ({String instalacionId, String fecha})>(
  (ref, params) async {
    final repo = ref.watch(instalacionRepositoryProvider);
    return repo.obtenerDisponibilidad(params.instalacionId, params.fecha);
  },
);
