import 'package:dio/dio.dart';
import '../core/dio_client.dart';

class ValoracionRepository {
  final _dio = DioClient.instance.dio;

  Future<void> enviarValoracion(
    String reservaId,
    int puntuacion,
    String? comentario,
  ) async {
    try {
      await _dio.post(
        '/api/valoraciones',
        data: {
          'reservaId': reservaId,
          'puntuacion': puntuacion,
          if (comentario != null && comentario.isNotEmpty)
            'comentario': comentario,
        },
      );
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al enviar valoración';
      throw Exception(msg);
    }
  }
}
