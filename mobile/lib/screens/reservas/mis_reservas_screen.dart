import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../models/reserva.dart';
import '../../models/lista_espera.dart';
import '../../providers/reserva_provider.dart';
import '../../providers/lista_espera_provider.dart';

const _colorPrimario = Color(0xFF1565C0);

class MisReservasScreen extends ConsumerStatefulWidget {
  const MisReservasScreen({super.key});

  @override
  ConsumerState<MisReservasScreen> createState() => _MisReservasScreenState();
}

class _MisReservasScreenState extends ConsumerState<MisReservasScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Reservas'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Activas'),
            Tab(text: 'Historial'),
            Tab(text: 'Lista de espera'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _TabActivas(),
          _TabHistorial(),
          _TabListaEspera(),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tab Activas
// ---------------------------------------------------------------------------
class _TabActivas extends ConsumerWidget {
  const _TabActivas();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reservasAsync = ref.watch(misReservasProvider);

    return reservasAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: _colorPrimario)),
      error: (e, _) => _ErrorWidget(
        mensaje: e.toString().replaceFirst('Exception: ', ''),
        onReintentar: () => ref.invalidate(misReservasProvider),
      ),
      data: (reservas) {
        final activas = reservas
            .where((r) => r.estado == 'ACTIVA' && r.esFutura)
            .toList();

        return RefreshIndicator(
          color: _colorPrimario,
          onRefresh: () async => ref.invalidate(misReservasProvider),
          child: activas.isEmpty
              ? const _ListaVacia(mensaje: 'No tienes reservas activas')
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: activas.length,
                  itemBuilder: (context, i) => _ReservaCard(
                    reserva: activas[i],
                    modoActiva: true,
                    onCancelar: () => _confirmarCancelacion(context, ref, activas[i]),
                  ),
                ),
        );
      },
    );
  }

  Future<void> _confirmarCancelacion(
    BuildContext context,
    WidgetRef ref,
    Reserva reserva,
  ) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar reserva'),
        content: Text(
          '¿Seguro que quieres cancelar tu reserva en '
          '${reserva.instalacion.nombre} el '
          '${_formatearFechaCorta(reserva.fecha)} '
          'a las ${reserva.horaInicio}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );

    if (confirmar != true || !context.mounted) return;

    try {
      await ref.read(reservaRepositoryProvider).cancelarReserva(reserva.id);
      ref.invalidate(misReservasProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Reserva cancelada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tab Historial
// ---------------------------------------------------------------------------
class _TabHistorial extends ConsumerWidget {
  const _TabHistorial();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reservasAsync = ref.watch(misReservasProvider);

    return reservasAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: _colorPrimario)),
      error: (e, _) => _ErrorWidget(
        mensaje: e.toString().replaceFirst('Exception: ', ''),
        onReintentar: () => ref.invalidate(misReservasProvider),
      ),
      data: (reservas) {
        final historial = reservas
            .where((r) => r.estado == 'CANCELADA' || !r.esFutura)
            .toList()
          ..sort((a, b) => b.fecha.compareTo(a.fecha));

        return RefreshIndicator(
          color: _colorPrimario,
          onRefresh: () async => ref.invalidate(misReservasProvider),
          child: historial.isEmpty
              ? const _ListaVacia(mensaje: 'No tienes reservas en el historial')
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: historial.length,
                  itemBuilder: (context, i) => _ReservaCard(
                    reserva: historial[i],
                    modoActiva: false,
                  ),
                ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Tab Lista de espera
// ---------------------------------------------------------------------------
class _TabListaEspera extends ConsumerWidget {
  const _TabListaEspera();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listaAsync = ref.watch(listaEsperaProvider);

    return listaAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: _colorPrimario)),
      error: (e, _) => _ErrorWidget(
        mensaje: e.toString().replaceFirst('Exception: ', ''),
        onReintentar: () => ref.invalidate(listaEsperaProvider),
      ),
      data: (lista) {
        final activas = lista
            .where((l) => l.estado == 'ESPERANDO' || l.estado == 'NOTIFICADO')
            .toList();

        return RefreshIndicator(
          color: _colorPrimario,
          onRefresh: () async => ref.invalidate(listaEsperaProvider),
          child: activas.isEmpty
              ? const _ListaVacia(mensaje: 'No estás en ninguna lista de espera')
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: activas.length,
                  itemBuilder: (context, i) => _ListaEsperaCard(
                    entrada: activas[i],
                    onAbandonar: () => _confirmarAbandono(context, ref, activas[i]),
                    onConfirmar: () => _confirmarTurno(context, ref, activas[i]),
                  ),
                ),
        );
      },
    );
  }

  Future<void> _confirmarAbandono(
    BuildContext context,
    WidgetRef ref,
    ListaEspera entrada,
  ) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Abandonar lista de espera'),
        content: Text(
          '¿Seguro que quieres abandonar la lista de espera para '
          '${entrada.instalacion.nombre}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sí, abandonar'),
          ),
        ],
      ),
    );

    if (confirmar != true || !context.mounted) return;

    try {
      await ref
          .read(listaEsperaRepositoryProvider)
          .abandonarListaEspera(entrada.id);
      ref.invalidate(listaEsperaProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Has abandonado la lista de espera'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _confirmarTurno(
    BuildContext context,
    WidgetRef ref,
    ListaEspera entrada,
  ) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar reserva'),
        content: Text(
          'Tu turno está disponible en ${entrada.instalacion.nombre} '
          'el ${_formatearFechaCorta(entrada.fecha)} '
          'de ${entrada.horaInicio} a ${entrada.horaFin}.\n\n'
          '¿Confirmas la reserva?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmar reserva'),
          ),
        ],
      ),
    );

    if (confirmar != true || !context.mounted) return;

    try {
      await ref
          .read(listaEsperaRepositoryProvider)
          .confirmarTurno(entrada.id);
      ref.invalidate(listaEsperaProvider);
      ref.invalidate(misReservasProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Reserva confirmada con éxito!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Widgets reutilizables
// ---------------------------------------------------------------------------

class _ReservaCard extends StatelessWidget {
  final Reserva reserva;
  final bool modoActiva;
  final VoidCallback? onCancelar;

  const _ReservaCard({
    required this.reserva,
    required this.modoActiva,
    this.onCancelar,
  });

  @override
  Widget build(BuildContext context) {
    final puedeCancelar = modoActiva && reserva.sePuedeCancelar;
    final yaTermino = !reserva.esFutura && reserva.estado == 'ACTIVA';
    final sinValorar = yaTermino && (reserva.valorada == null || reserva.valorada == false);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    reserva.instalacion.nombre,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                _EstadoBadge(estado: reserva.estado),
              ],
            ),
            const SizedBox(height: 8),
            _InfoFila(
              icono: Icons.calendar_today,
              texto: _formatearFechaLarga(reserva.fecha),
            ),
            const SizedBox(height: 4),
            _InfoFila(
              icono: Icons.access_time,
              texto: '${reserva.horaInicio} – ${reserva.horaFin}',
            ),
            if (reserva.instalacion.tipo.isNotEmpty) ...[
              const SizedBox(height: 4),
              _InfoFila(
                icono: Icons.sports,
                texto: reserva.instalacion.tipo,
              ),
            ],
            // Historial: valoración
            if (!modoActiva && sinValorar) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.star_border, color: _colorPrimario),
                  label: const Text('Valorar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _colorPrimario,
                    side: const BorderSide(color: _colorPrimario),
                  ),
                  onPressed: () => context.push(
                    '/valorar/${reserva.id}',
                    extra: reserva,
                  ),
                ),
              ),
            ],
            if (!modoActiva && reserva.valorada == true) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    'Ya valorada',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                ],
              ),
            ],
            // Activas: botones QR y Cancelar
            if (modoActiva) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (reserva.qrToken != null)
                    Expanded(
                      child: FilledButton.icon(
                        icon: const Icon(Icons.qr_code),
                        label: const Text('Ver QR'),
                        style: FilledButton.styleFrom(
                          backgroundColor: _colorPrimario,
                        ),
                        onPressed: () => context.push(
                          '/qr/${reserva.qrToken}',
                          extra: reserva,
                        ),
                      ),
                    ),
                  if (reserva.qrToken != null && puedeCancelar)
                    const SizedBox(width: 8),
                  if (puedeCancelar)
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.cancel_outlined),
                        label: const Text('Cancelar'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                        ),
                        onPressed: onCancelar,
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ListaEsperaCard extends StatelessWidget {
  final ListaEspera entrada;
  final VoidCallback onAbandonar;
  final VoidCallback onConfirmar;

  const _ListaEsperaCard({
    required this.entrada,
    required this.onAbandonar,
    required this.onConfirmar,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    entrada.instalacion.nombre,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                _BadgeListaEspera(estado: entrada.estado, posicion: entrada.posicion),
              ],
            ),
            const SizedBox(height: 8),
            _InfoFila(
              icono: Icons.calendar_today,
              texto: _formatearFechaLarga(entrada.fecha),
            ),
            const SizedBox(height: 4),
            _InfoFila(
              icono: Icons.access_time,
              texto: '${entrada.horaInicio} – ${entrada.horaFin}',
            ),
            if (entrada.estado == 'NOTIFICADO' && entrada.expiraEn != null) ...[
              const SizedBox(height: 8),
              _TimerExpiracion(expiraEn: entrada.expiraEn!),
            ],
            const SizedBox(height: 12),
            if (entrada.estado == 'ESPERANDO')
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.exit_to_app),
                  label: const Text('Abandonar lista'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                  onPressed: onAbandonar,
                ),
              ),
            if (entrada.estado == 'NOTIFICADO')
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Confirmar reserva'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.green,
                  ),
                  onPressed: onConfirmar,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TimerExpiracion extends StatefulWidget {
  final DateTime expiraEn;
  const _TimerExpiracion({required this.expiraEn});

  @override
  State<_TimerExpiracion> createState() => _TimerExpiracionState();
}

class _TimerExpiracionState extends State<_TimerExpiracion> {
  late Duration _restante;

  @override
  void initState() {
    super.initState();
    _restante = widget.expiraEn.difference(DateTime.now());
    _tick();
  }

  void _tick() {
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _restante = widget.expiraEn.difference(DateTime.now());
      });
      if (_restante.isNegative) return;
      _tick();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_restante.isNegative) {
      return const Text(
        'Tiempo expirado',
        style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
      );
    }
    final minutos = _restante.inMinutes.remainder(60).toString().padLeft(2, '0');
    final segundos = _restante.inSeconds.remainder(60).toString().padLeft(2, '0');
    return Row(
      children: [
        const Icon(Icons.timer, size: 16, color: Colors.orange),
        const SizedBox(width: 4),
        Text(
          'Tiempo restante: ${_restante.inHours > 0 ? '${_restante.inHours}h ' : ''}$minutos:$segundos',
          style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _EstadoBadge extends StatelessWidget {
  final String estado;
  const _EstadoBadge({required this.estado});

  @override
  Widget build(BuildContext context) {
    final (color, texto) = switch (estado) {
      'ACTIVA' => (Colors.green, 'Activa'),
      'CANCELADA' => (Colors.red, 'Cancelada'),
      _ => (Colors.grey, estado),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(
        texto,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _BadgeListaEspera extends StatelessWidget {
  final String estado;
  final int? posicion;
  const _BadgeListaEspera({required this.estado, this.posicion});

  @override
  Widget build(BuildContext context) {
    final (color, texto) = switch (estado) {
      'ESPERANDO' =>
        (Colors.grey, posicion != null ? 'Pos. $posicion' : 'En espera'),
      'NOTIFICADO' => (Colors.orange, '¡Turno disponible!'),
      'CONFIRMADO' => (Colors.green, 'Confirmado'),
      'EXPIRADO' => (Colors.red, 'Expirado'),
      'CANCELADO' => (Colors.grey, 'Cancelado'),
      _ => (Colors.grey, estado),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(
        texto,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _InfoFila extends StatelessWidget {
  final IconData icono;
  final String texto;
  const _InfoFila({required this.icono, required this.texto});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icono, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            texto,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[700],
                ),
          ),
        ),
      ],
    );
  }
}

class _ListaVacia extends StatelessWidget {
  final String mensaje;
  const _ListaVacia({required this.mensaje});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.5,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.inbox_outlined,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  mensaje,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.grey[600],
                      ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ErrorWidget extends StatelessWidget {
  final String mensaje;
  final VoidCallback onReintentar;
  const _ErrorWidget({required this.mensaje, required this.onReintentar});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(
              mensaje,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: FilledButton.styleFrom(backgroundColor: _colorPrimario),
              onPressed: onReintentar,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers de formato de fecha
// ---------------------------------------------------------------------------

String _formatearFechaLarga(String fecha) {
  try {
    final dt = DateTime.parse(fecha);
    return DateFormat('EEEE, d \'de\' MMMM \'de\' yyyy', 'es').format(dt);
  } catch (_) {
    return fecha;
  }
}

String _formatearFechaCorta(String fecha) {
  try {
    final dt = DateTime.parse(fecha);
    return DateFormat('dd/MM/yyyy', 'es').format(dt);
  } catch (_) {
    return fecha;
  }
}
