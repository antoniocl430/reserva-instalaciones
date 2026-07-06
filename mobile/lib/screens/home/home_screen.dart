import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/instalacion.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/aviso_provider.dart';
import '../../providers/instalacion_provider.dart';
import '../../widgets/aviso_card.dart';
import '../../widgets/instalacion_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _tabActual = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tabActual,
        children: [
          _HomePrincipalTab(onVerInstalaciones: () => setState(() => _tabActual = 1)),
          _InstalacionesTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabActual,
        onDestinationSelected: (i) {
          if (i == 2) {
            context.push('/mis-reservas');
          } else if (i == 3) {
            context.push('/perfil');
          } else {
            setState(() => _tabActual = i);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.stadium_outlined),
            selectedIcon: Icon(Icons.stadium),
            label: 'Instalaciones',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Mis reservas',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}

// ─── Tab 0: Inicio principal ──────────────────────────────────────────────────

class _HomePrincipalTab extends ConsumerStatefulWidget {
  const _HomePrincipalTab({required this.onVerInstalaciones});
  final VoidCallback onVerInstalaciones;

  @override
  ConsumerState<_HomePrincipalTab> createState() => _HomePrincipalTabState();
}

class _HomePrincipalTabState extends ConsumerState<_HomePrincipalTab> {
  Future<void> _refrescar() async {
    ref.invalidate(instalacionesProvider);
    ref.invalidate(avisosProvider);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final instalacionesAsync = ref.watch(instalacionesProvider);
    final avisosAsync = ref.watch(avisosProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          AppConstants.tenantNombre,
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => context.push('/perfil'),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: colorScheme.primaryContainer,
                backgroundImage: authState.usuario?.avatarUrl != null
                    ? NetworkImage(authState.usuario!.avatarUrl!)
                    : null,
                child: authState.usuario?.avatarUrl == null
                    ? Text(
                        (authState.usuario?.nombre ?? 'U')
                            .substring(0, 1)
                            .toUpperCase(),
                        style: TextStyle(
                          color: colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
            ),
          ),
        ],
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _refrescar,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            // Saludo
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '¡Hola, ${authState.usuario?.nombre.split(' ').first ?? 'deportista'}!',
                    style: textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '¿Qué deporte practicas hoy?',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),

            // ─── Verificar QR (confirmar asistencia) ─────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => context.push('/verificar-qr'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colorScheme.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.qr_code_scanner,
                          color: Colors.white, size: 32),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Verificar QR',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Escanea el QR de la pista para confirmar tu asistencia',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Colors.white70),
                    ],
                  ),
                ),
              ),
            ),

            // ─── Instalaciones disponibles ───────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Instalaciones disponibles',
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  TextButton(
                    onPressed: widget.onVerInstalaciones,
                    child: const Text('Ver todas'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            instalacionesAsync.when(
              loading: () => const SizedBox(
                height: 200,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _ErrorCard(
                  mensaje: 'No se pudieron cargar las instalaciones',
                  onReintentar: () => ref.invalidate(instalacionesProvider),
                ),
              ),
              data: (instalaciones) {
                if (instalaciones.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: _VacioCard(
                      icono: Icons.stadium_outlined,
                      mensaje: 'No hay instalaciones disponibles',
                    ),
                  );
                }
                final visibles = instalaciones.take(5).toList();
                return SizedBox(
                  height: 220,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: visibles.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, i) => InstalacionCard(
                      instalacion: visibles[i],
                      compact: true,
                      onTap: () => context.push(
                        '/instalacion/${visibles[i].id}',
                        extra: visibles[i],
                      ),
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 20),

            // ─── Tablón de avisos ─────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                'Tablón de avisos',
                style:
                    textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            avisosAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _ErrorCard(
                  mensaje: 'No se pudieron cargar los avisos',
                  onReintentar: () => ref.invalidate(avisosProvider),
                ),
              ),
              data: (avisos) {
                if (avisos.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: _VacioCard(
                      icono: Icons.campaign_outlined,
                      mensaje: 'No hay avisos en este momento',
                    ),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: avisos.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => AvisoCard(aviso: avisos[i]),
                );
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─── Tab 1: Instalaciones ─────────────────────────────────────────────────────

class _InstalacionesTab extends ConsumerStatefulWidget {
  @override
  ConsumerState<_InstalacionesTab> createState() => _InstalacionesTabState();
}

class _InstalacionesTabState extends ConsumerState<_InstalacionesTab> {
  final _busquedaCtrl = TextEditingController();
  String _filtro = '';

  @override
  void dispose() {
    _busquedaCtrl.dispose();
    super.dispose();
  }

  List<Instalacion> _filtrar(List<Instalacion> lista) {
    if (_filtro.isEmpty) return lista;
    final q = _filtro.toLowerCase();
    return lista
        .where((i) =>
            i.nombre.toLowerCase().contains(q) ||
            i.tipo.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final instalacionesAsync = ref.watch(instalacionesProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Instalaciones',
            style: TextStyle(fontWeight: FontWeight.w600)),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(68),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SearchBar(
              controller: _busquedaCtrl,
              hintText: 'Buscar instalaciones...',
              leading: const Icon(Icons.search),
              trailing: [
                if (_filtro.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _busquedaCtrl.clear();
                      setState(() => _filtro = '');
                    },
                  ),
              ],
              onChanged: (v) => setState(() => _filtro = v),
              backgroundColor: WidgetStateProperty.all(colorScheme.surface),
              elevation: WidgetStateProperty.all(1),
            ),
          ),
        ),
      ),
      body: instalacionesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: _ErrorCard(
            mensaje: 'No se pudieron cargar las instalaciones',
            onReintentar: () => ref.invalidate(instalacionesProvider),
          ),
        ),
        data: (instalaciones) {
          final filtradas = _filtrar(instalaciones);
          if (filtradas.isEmpty && _filtro.isNotEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.search_off, size: 56),
                  const SizedBox(height: 12),
                  Text('Sin resultados para "$_filtro"'),
                ],
              ),
            );
          }
          if (filtradas.isEmpty) {
            return const Center(
              child: _VacioCard(
                icono: Icons.stadium_outlined,
                mensaje: 'No hay instalaciones disponibles',
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(instalacionesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              itemCount: filtradas.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => InstalacionCard(
                instalacion: filtradas[i],
                onTap: () => context.push(
                  '/instalacion/${filtradas[i].id}',
                  extra: filtradas[i],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.mensaje, required this.onReintentar});
  final String mensaje;
  final VoidCallback onReintentar;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Icon(Icons.wifi_off_rounded,
              color: colorScheme.onErrorContainer, size: 36),
          const SizedBox(height: 8),
          Text(
            mensaje,
            style: TextStyle(color: colorScheme.onErrorContainer),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: onReintentar,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}

class _VacioCard extends StatelessWidget {
  const _VacioCard({required this.icono, required this.mensaje});
  final IconData icono;
  final String mensaje;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Icon(icono, size: 40, color: colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          Text(
            mensaje,
            style: TextStyle(color: colorScheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
