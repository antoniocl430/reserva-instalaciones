import 'package:dio/dio.dart';
import 'constants.dart';
import 'secure_storage.dart';

class DioClient {
  DioClient._();
  static DioClient? _instance;
  static DioClient get instance => _instance ??= DioClient._();

  late final Dio _dio = _buildDio();

  Dio get dio => _dio;

  Dio _buildDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.instance.obtenerToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          final slug = await SecureStorage.instance.obtenerTenantSlug();
          if (slug != null) {
            options.headers['x-tenant-slug'] = slug;
          }
          handler.next(options);
        },
        onError: (error, handler) {
          final mensaje = _mensajeDeError(error);
          handler.next(
            DioException(
              requestOptions: error.requestOptions,
              error: mensaje,
              message: mensaje,
              type: error.type,
              response: error.response,
            ),
          );
        },
      ),
    );

    return dio;
  }

  String _mensajeDeError(DioException error) {
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.unknown) {
      return 'Sin conexión a internet';
    }
    switch (error.response?.statusCode) {
      case 401:
        return 'Sesión expirada, inicia sesión de nuevo';
      case 403:
        return 'No tienes permiso para realizar esta acción';
      case 404:
        return 'Recurso no encontrado';
      case 500:
        return 'Error del servidor, inténtalo más tarde';
      default:
        return error.response?.data?['mensaje'] ??
            error.response?.data?['message'] ??
            'Ha ocurrido un error inesperado';
    }
  }

  void reset() {
    _instance = null;
  }
}
