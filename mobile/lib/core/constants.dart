class AppConstants {
  // Backend en producción (Vercel). Para desarrollo local con el emulador
  // Android, usar 'http://10.0.2.2:3000'.
  static const String apiBaseUrl = 'https://reserva-instalaciones.vercel.app';

  // Ayuntamiento fijo de la app (no hay selector de municipio).
  static const String tenantSlug = 'desarrollo';
  static const String tenantNombre = 'Ayuntamiento de Herrera';

  static const String tokenKey = 'auth_token';
  static const String tenantSlugKey = 'tenant_slug';
  static const String tenantNombreKey = 'tenant_nombre';
  static const String tenantIdKey = 'tenant_id';
}
