import 'package:dio/dio.dart';
import '../core/constants.dart';
import '../core/secure_storage.dart';
import '../models/usuario.dart';

class AuthRepository {
  late final Dio _dio;

  AuthRepository() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));
  }

  // Ayuntamiento fijo (Herrera): siempre se envía este slug.
  Future<String> _slug() async =>
      (await SecureStorage.instance.obtenerTenantSlug()) ?? AppConstants.tenantSlug;

  Future<Usuario> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/api/auth/mobile/login',
        data: {'email': email, 'password': password},
        options: Options(headers: {'x-tenant-slug': await _slug()}),
      );
      final token = response.data['token'] as String;
      await SecureStorage.instance.guardarToken(token);
      return Usuario.fromJson(response.data['usuario'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ??
          e.response?.data?['mensaje'] ??
          'Error al iniciar sesión';
      throw Exception(msg);
    }
  }

  Future<Usuario> registro(String nombre, String email, String password) async {
    try {
      final response = await _dio.post(
        '/api/auth/mobile/registro',
        data: {'nombre': nombre, 'email': email, 'password': password},
        options: Options(headers: {'x-tenant-slug': await _slug()}),
      );
      final token = response.data['token'] as String;
      await SecureStorage.instance.guardarToken(token);
      return Usuario.fromJson(response.data['usuario'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ??
          e.response?.data?['mensaje'] ??
          'Error al registrarse';
      throw Exception(msg);
    }
  }

  Future<void> logout() async {
    await SecureStorage.instance.limpiarTodo();
  }

  Future<void> recuperarPassword(String email) async {
    try {
      await _dio.post(
        '/api/auth/mobile/recuperar',
        data: {'email': email},
        options: Options(headers: {'x-tenant-slug': await _slug()}),
      );
    } catch (_) {
      // Siempre retornamos éxito para no revelar si el email existe
    }
  }

  Future<Usuario?> obtenerUsuarioGuardado() async {
    final token = await SecureStorage.instance.obtenerToken();
    if (token == null) return null;
    try {
      final response = await _dio.get(
        '/api/perfil',
        options: Options(headers: {
          'Authorization': 'Bearer $token',
          'x-tenant-slug': await _slug(),
        }),
      );
      return Usuario.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      await SecureStorage.instance.eliminarToken();
      return null;
    }
  }
}
