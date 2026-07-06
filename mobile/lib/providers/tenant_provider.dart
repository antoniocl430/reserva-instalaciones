import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tenant.dart';
import '../repositories/tenant_repository.dart';

class TenantState {
  final List<Tenant> tenants;
  final Tenant? seleccionado;
  final bool isLoading;
  final String? error;

  const TenantState({
    this.tenants = const [],
    this.seleccionado,
    this.isLoading = false,
    this.error,
  });

  TenantState copyWith({
    List<Tenant>? tenants,
    Tenant? seleccionado,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearSeleccionado = false,
  }) {
    return TenantState(
      tenants: tenants ?? this.tenants,
      seleccionado: clearSeleccionado ? null : seleccionado ?? this.seleccionado,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
    );
  }
}

class TenantNotifier extends StateNotifier<TenantState> {
  final TenantRepository _repo;

  TenantNotifier(this._repo) : super(const TenantState()) {
    _cargarTenantGuardado();
  }

  Future<void> _cargarTenantGuardado() async {
    final tenant = await _repo.obtenerTenantGuardado();
    if (tenant != null) {
      state = state.copyWith(seleccionado: tenant);
    }
  }

  Future<void> cargarTenants() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final tenants = await _repo.obtenerTenants();
      state = state.copyWith(isLoading: false, tenants: tenants);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> seleccionarTenant(Tenant tenant) async {
    await _repo.guardarTenant(tenant);
    state = state.copyWith(seleccionado: tenant);
  }

  Future<void> limpiarTenant() async {
    await _repo.limpiarTenant();
    state = state.copyWith(clearSeleccionado: true);
  }
}

final tenantRepositoryProvider = Provider<TenantRepository>((ref) {
  return TenantRepository();
});

final tenantProvider = StateNotifierProvider<TenantNotifier, TenantState>((ref) {
  return TenantNotifier(ref.watch(tenantRepositoryProvider));
});
