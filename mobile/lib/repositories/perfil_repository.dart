import 'package:dio/dio.dart';
import '../core/dio_client.dart';
import '../models/usuario.dart';

class PerfilRepository {
  final _dio = DioClient.instance.dio;

  Future<Usuario> obtenerPerfil() async {
    try {
      final response = await _dio.get('/api/perfil');
      return Usuario.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cargar perfil';
      throw Exception(msg);
    }
  }

  Future<Usuario> actualizarNombre(String nombre) async {
    try {
      final response = await _dio.patch(
        '/api/perfil',
        data: {'nombre': nombre},
      );
      // El backend devuelve { ok: true, usuario: {...} }
      final data = (response.data['usuario'] ?? response.data) as Map<String, dynamic>;
      return Usuario.fromJson(data);
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al actualizar nombre';
      throw Exception(msg);
    }
  }

  Future<void> cambiarPassword(
    String passwordActual,
    String passwordNueva,
  ) async {
    try {
      await _dio.patch(
        '/api/perfil',
        data: {
          'passwordActual': passwordActual,
          'passwordNueva': passwordNueva,
        },
      );
    } on DioException catch (e) {
      final msg = e.message ?? 'Error al cambiar contraseña';
      throw Exception(msg);
    }
  }
}
