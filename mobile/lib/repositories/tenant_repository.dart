import 'package:dio/dio.dart';
import '../core/constants.dart';
import '../core/secure_storage.dart';
import '../models/tenant.dart';

class TenantRepository {
  late final Dio _dio;

  TenantRepository() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));
  }

  Future<List<Tenant>> obtenerTenants() async {
    try {
      final response = await _dio.get('/api/tenants/publicos');
      final data = response.data as List<dynamic>;
      return data
          .map((e) => Tenant.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final msg = e.response?.data?['mensaje'] ?? e.message ?? 'Error al cargar municipios';
      throw Exception(msg);
    }
  }

  Future<void> guardarTenant(Tenant tenant) async {
    await SecureStorage.instance.guardarTenant(tenant.id, tenant.slug, tenant.nombre);
  }

  Future<Tenant?> obtenerTenantGuardado() async {
    final id = await SecureStorage.instance.obtenerTenantId();
    final slug = await SecureStorage.instance.obtenerTenantSlug();
    final nombre = await SecureStorage.instance.obtenerTenantNombre();
    if (id == null || slug == null || nombre == null) return null;
    return Tenant(id: id, slug: slug, nombre: nombre, municipio: nombre);
  }

  Future<void> limpiarTenant() async {
    await SecureStorage.instance.limpiarTodo();
  }
}
