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

  Future<Usuario> login(String email, String password) async {
    try {
      final tenantSlug = await SecureStorage.instance.obtenerTenantSlug();
      final response = await _dio.post(
        '/api/auth/mobile/login',
        data: {'email': email, 'password': password},
        options: Options(headers: {
          if (tenantSlug != null) 'x-tenant-slug': tenantSlug,
        }),
      );
      final token = response.data['token'] as String;
      await SecureStorage.instance.guardarToken(token);
      return Usuario.fromJson(response.data['usuario'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.response?.data?['mensaje'] ?? e.message ?? 'Error al iniciar sesión';
      throw Exception(msg);
    }
  }

  Future<Usuario> registro(String nombre, String email, String password) async {
    try {
      final tenantSlug = await SecureStorage.instance.obtenerTenantSlug();
      final response = await _dio.post(
        '/api/auth/mobile/registro',
        data: {'nombre': nombre, 'email': email, 'password': password},
        options: Options(headers: {
          if (tenantSlug != null) 'x-tenant-slug': tenantSlug,
        }),
      );
      final token = response.data['token'] as String;
      await SecureStorage.instance.guardarToken(token);
      return Usuario.fromJson(response.data['usuario'] as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.response?.data?['mensaje'] ?? e.message ?? 'Error al registrarse';
      throw Exception(msg);
    }
  }

  Future<void> logout() async {
    await SecureStorage.instance.limpiarTodo();
  }

  Future<void> recuperarPassword(String email) async {
    try {
      final tenantSlug = await SecureStorage.instance.obtenerTenantSlug();
      await _dio.post(
        '/api/auth/mobile/recuperar',
        data: {'email': email},
        options: Options(headers: {
          if (tenantSlug != null) 'x-tenant-slug': tenantSlug,
        }),
      );
    } catch (_) {
      // Siempre retornamos éxito para no revelar si el email existe
    }
  }

  Future<Usuario?> obtenerUsuarioGuardado() async {
    final token = await SecureStorage.instance.obtenerToken();
    if (token == null) return null;
    try {
      final slug = await SecureStorage.instance.obtenerTenantSlug();
      final response = await _dio.get(
        '/api/perfil',
        options: Options(headers: {
          'Authorization': 'Bearer $token',
          if (slug != null) 'x-tenant-slug': slug,
        }),
      );
      return Usuario.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      await SecureStorage.instance.eliminarToken();
      return null;
    }
  }
}
