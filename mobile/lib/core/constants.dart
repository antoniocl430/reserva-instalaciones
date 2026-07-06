class AppConstants {
  // Backend en producción (Vercel). Para desarrollo local con el emulador
  // Android, usar 'http://10.0.2.2:3000'.
  static const String apiBaseUrl = 'https://reserva-instalaciones.vercel.app';

  static const String tokenKey = 'auth_token';
  static const String tenantSlugKey = 'tenant_slug';
  static const String tenantNombreKey = 'tenant_nombre';
  static const String tenantIdKey = 'tenant_id';
}
