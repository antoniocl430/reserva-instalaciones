import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/tenant.dart';
import '../../providers/tenant_provider.dart';

class SeleccionMunicipioScreen extends ConsumerStatefulWidget {
  const SeleccionMunicipioScreen({super.key});

  @override
  ConsumerState<SeleccionMunicipioScreen> createState() =>
      _SeleccionMunicipioScreenState();
}

class _SeleccionMunicipioScreenState
    extends ConsumerState<SeleccionMunicipioScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(tenantProvider.notifier).cargarTenants();
    });
  }

  @override
  Widget build(BuildContext context) {
    final tenantState = ref.watch(tenantProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        centerTitle: true,
        title: const Text('Elige tu municipio'),
        elevation: 0,
      ),
      body: Column(
        children: [
          _Cabecera(colorScheme: colorScheme),
          Expanded(
            child: _CuerpoLista(
              tenantState: tenantState,
              onRecargar: () =>
                  ref.read(tenantProvider.notifier).cargarTenants(),
              onSeleccionar: (tenant) async {
                await ref
                    .read(tenantProvider.notifier)
                    .seleccionarTenant(tenant);
                if (context.mounted) {
                  context.go('/login');
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Cabecera extends StatelessWidget {
  const _Cabecera({required this.colorScheme});
  final ColorScheme colorScheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      decoration: BoxDecoration(
        color: colorScheme.primary,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Icon(Icons.sports_tennis, size: 56, color: colorScheme.onPrimary),
          const SizedBox(height: 12),
          Text(
            'Reserva instalaciones deportivas\nde tu ayuntamiento',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: colorScheme.onPrimary,
                  height: 1.4,
                ),
          ),
        ],
      ),
    );
  }
}

class _CuerpoLista extends StatelessWidget {
  const _CuerpoLista({
    required this.tenantState,
    required this.onRecargar,
    required this.onSeleccionar,
  });

  final TenantState tenantState;
  final VoidCallback onRecargar;
  final void Function(Tenant) onSeleccionar;

  @override
  Widget build(BuildContext context) {
    if (tenantState.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (tenantState.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.wifi_off_rounded,
                size: 56,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'No se pudieron cargar los municipios',
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                tenantState.error!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.error,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRecargar,
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    if (tenantState.tenants.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_off_outlined, size: 56),
            const SizedBox(height: 16),
            const Text('No hay municipios disponibles'),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRecargar,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 12),
      itemCount: tenantState.tenants.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, index) {
        final tenant = tenantState.tenants[index];
        return _TenantTile(tenant: tenant, onTap: () => onSeleccionar(tenant));
      },
    );
  }
}

class _TenantTile extends StatelessWidget {
  const _TenantTile({required this.tenant, required this.onTap});
  final Tenant tenant;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: tenant.logoUrl != null && tenant.logoUrl!.isNotEmpty
            ? ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  tenant.logoUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Icon(
                    Icons.location_city,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              )
            : Icon(
                Icons.location_city,
                color: colorScheme.onPrimaryContainer,
              ),
      ),
      title: Text(
        tenant.nombre,
        style: Theme.of(context)
            .textTheme
            .titleSmall
            ?.copyWith(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        tenant.municipio,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
      ),
      trailing: Icon(
        Icons.chevron_right,
        color: colorScheme.onSurfaceVariant,
      ),
    );
  }
}
