import 'package:dio/dio.dart';
import '../core/dio_client.dart';
import '../models/aviso.dart';

class AvisoRepository {
  final _dio = DioClient.instance.dio;

  Future<List<Aviso>> obtenerAvisos([String? tenantId]) async {
    try {
      final response = await _dio.get('/api/avisos');
      final data = response.data as List<dynamic>;
      return data
          .map((e) => Aviso.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar avisos';
      throw Exception(msg);
    }
  }
}
