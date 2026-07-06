import 'package:dio/dio.dart';
import '../core/dio_client.dart';
import '../models/instalacion.dart';
import '../models/slot.dart';

class InstalacionRepository {
  final _dio = DioClient.instance.dio;

  Future<List<Instalacion>> obtenerInstalaciones([String? tenantId]) async {
    try {
      final response = await _dio.get('/api/instalaciones');
      final data = response.data as List<dynamic>;
      return data
          .map((e) => Instalacion.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar instalaciones';
      throw Exception(msg);
    }
  }

  Future<List<Slot>> obtenerDisponibilidad(
      String instalacionId, String fecha) async {
    try {
      final response = await _dio.get(
        '/api/disponibilidad',
        queryParameters: {'instalacionId': instalacionId, 'fecha': fecha},
      );
      final data = response.data as List<dynamic>;
      return data.map((e) => Slot.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar disponibilidad';
      throw Exception(msg);
    }
  }
}
