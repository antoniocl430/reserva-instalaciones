import 'package:dio/dio.dart';
import '../core/dio_client.dart';
import '../models/lista_espera.dart';
import '../models/reserva.dart';

class ListaEsperaRepository {
  final _dio = DioClient.instance.dio;

  Future<List<ListaEspera>> obtenerListaEspera() async {
    try {
      final response = await _dio.get('/api/lista-espera');
      // El backend devuelve { entradas: [...] }
      final lista = (response.data['entradas'] ?? response.data) as List<dynamic>;
      return lista
          .map((e) => ListaEspera.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar lista de espera';
      throw Exception(msg);
    }
  }

  Future<ListaEspera> unirseListaEspera(
    String instalacionId,
    String fecha,
    String horaInicio,
  ) async {
    try {
      final response = await _dio.post(
        '/api/lista-espera',
        data: {
          'instalacionId': instalacionId,
          'fecha': fecha,
          'horaInicio': horaInicio,
        },
      );
      // El backend devuelve { entrada: {...} }
      final data = (response.data['entrada'] ?? response.data) as Map<String, dynamic>;
      return ListaEspera.fromJson(data);
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al unirse a la lista de espera';
      throw Exception(msg);
    }
  }

  Future<void> abandonarListaEspera(String id) async {
    try {
      await _dio.delete('/api/lista-espera/$id');
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al abandonar la lista de espera';
      throw Exception(msg);
    }
  }

  Future<Reserva> confirmarTurno(String id) async {
    try {
      final response = await _dio.post('/api/lista-espera/$id/confirmar');
      // El backend devuelve { reserva: {...} }
      final data = (response.data['reserva'] ?? response.data) as Map<String, dynamic>;
      return Reserva.fromJson(data);
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al confirmar turno';
      throw Exception(msg);
    }
  }
}
