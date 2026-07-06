import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

class SecureStorage {
  SecureStorage._();
  static final SecureStorage instance = SecureStorage._();

  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  Future<void> guardarToken(String token) async {
    await _storage.write(key: AppConstants.tokenKey, value: token);
  }

  Future<String?> obtenerToken() async {
    return await _storage.read(key: AppConstants.tokenKey);
  }

  Future<void> eliminarToken() async {
    await _storage.delete(key: AppConstants.tokenKey);
  }

  Future<void> guardarTenant(String id, String slug, String nombre) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tenantIdKey, id);
    await prefs.setString(AppConstants.tenantSlugKey, slug);
    await prefs.setString(AppConstants.tenantNombreKey, nombre);
  }

  Future<String?> obtenerTenantSlug() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tenantSlugKey);
  }

  Future<String?> obtenerTenantId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tenantIdKey);
  }

  Future<String?> obtenerTenantNombre() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tenantNombreKey);
  }

  Future<void> limpiarTodo() async {
    await _storage.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tenantIdKey);
    await prefs.remove(AppConstants.tenantSlugKey);
    await prefs.remove(AppConstants.tenantNombreKey);
  }
}
