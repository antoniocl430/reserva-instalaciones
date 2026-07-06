import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/aviso.dart';
import '../repositories/aviso_repository.dart';

final avisoRepositoryProvider = Provider<AvisoRepository>((ref) {
  return AvisoRepository();
});

final avisosProvider = FutureProvider<List<Aviso>>((ref) async {
  final repo = ref.watch(avisoRepositoryProvider);
  return repo.obtenerAvisos();
});
