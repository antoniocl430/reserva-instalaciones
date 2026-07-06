import 'package:dio/dio.dart';
import '../core/dio_client.dart';
import '../models/reserva.dart';

class ReservaRepository {
  final _dio = DioClient.instance.dio;

  Future<List<Reserva>> obtenerMisReservas() async {
    try {
      final response = await _dio.get('/api/reservas/mis-reservas');
      // El backend devuelve { activas: [...], historial: [...] }.
      // Las combinamos en una sola lista; cada pantalla filtra por estado/fecha.
      final data = response.data as Map<String, dynamic>;
      final activas = (data['activas'] as List<dynamic>? ?? []);
      final historial = (data['historial'] as List<dynamic>? ?? []);
      return [...activas, ...historial]
          .map((e) => Reserva.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar reservas';
      throw Exception(msg);
    }
  }

  Future<void> cancelarReserva(String reservaId) async {
    try {
      await _dio.patch('/api/reservas/$reservaId/cancelar');
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cancelar reserva';
      throw Exception(msg);
    }
  }

  Future<Reserva> crearReserva(
    String instalacionId,
    String fecha,
    String horaInicio,
    String horaFin,
  ) async {
    try {
      final response = await _dio.post(
        '/api/reservas',
        data: {
          'instalacionId': instalacionId,
          'fecha': fecha,
          'horaInicio': horaInicio,
          'horaFin': horaFin,
        },
      );
      // El backend devuelve { reserva: {...} }
      final data = (response.data['reserva'] ?? response.data) as Map<String, dynamic>;
      return Reserva.fromJson(data);
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al crear reserva';
      throw Exception(msg);
    }
  }
}
