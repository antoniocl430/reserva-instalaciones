import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/lista_espera.dart';
import '../../providers/lista_espera_provider.dart';
import '../../providers/reserva_provider.dart';

const _colorPrimario = Color(0xFF1565C0);

class ListaEsperaScreen extends ConsumerWidget {
  const ListaEsperaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listaAsync = ref.watch(listaEsperaProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lista de espera'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
      ),
      body: listaAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: _colorPrimario),
        ),
        error: (e, _) => _ErrorWidget(
          mensaje: e.toString().replaceFirst('Exception: ', ''),
          onReintentar: () => ref.invalidate(listaEsperaProvider),
        ),
        data: (lista) => RefreshIndicator(
          color: _colorPrimario,
          onRefresh: () async => ref.invalidate(listaEsperaProvider),
          child: lista.isEmpty
              ? _ListaVacia()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: lista.length,
                  itemBuilder: (context, i) => _EntradaCard(
                    entrada: lista[i],
                    onAbandonar: () =>
                        _confirmarAbandono(context, ref, lista[i]),
                    onConfirmar: () =>
                        _confirmarTurno(context, ref, lista[i]),
                  ),
                ),
        ),
      ),
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
          '¿Seguro que quieres salir de la lista de espera para '
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
            child: const Text('Sí, salir'),
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
            content: Text('Has salido de la lista de espera'),
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
        icon: const Icon(Icons.sports_score, color: Colors.green, size: 36),
        title: const Text('¡Tu turno está disponible!'),
        content: Text(
          'Puedes reservar ${entrada.instalacion.nombre}\n'
          'el ${_formatearFechaLarga(entrada.fecha)}\n'
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
// Card de cada posición en lista de espera
// ---------------------------------------------------------------------------

class _EntradaCard extends StatelessWidget {
  final ListaEspera entrada;
  final VoidCallback onAbandonar;
  final VoidCallback onConfirmar;

  const _EntradaCard({
    required this.entrada,
    required this.onAbandonar,
    required this.onConfirmar,
  });

  @override
  Widget build(BuildContext context) {
    final esNotificado = entrada.estado == 'NOTIFICADO';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: esNotificado ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: esNotificado
            ? const BorderSide(color: Colors.orange, width: 2)
            : BorderSide.none,
      ),
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
                _BadgeEstado(
                  estado: entrada.estado,
                  posicion: entrada.posicion,
                ),
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
            if (entrada.instalacion.tipo.isNotEmpty) ...[
              const SizedBox(height: 4),
              _InfoFila(
                icono: Icons.sports,
                texto: entrada.instalacion.tipo,
              ),
            ],
            // Banner + timer para NOTIFICADO
            if (esNotificado) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.notifications_active,
                        color: Colors.orange, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '¡Tu turno está disponible!',
                            style: TextStyle(
                              color: Colors.orange,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (entrada.expiraEn != null) ...[
                            const SizedBox(height: 2),
                            _TimerExpiracion(expiraEn: entrada.expiraEn!),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            // Botones según estado
            if (entrada.estado == 'ESPERANDO')
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.exit_to_app),
                  label: const Text('Abandonar lista'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: onAbandonar,
                ),
              ),
            if (esNotificado)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text(
                    'Confirmar reserva',
                    style: TextStyle(fontSize: 16),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: onConfirmar,
                ),
              ),
            if (entrada.estado == 'CONFIRMADO')
              _InfoEstadoFinal(
                icono: Icons.check_circle,
                color: Colors.green,
                texto: 'Reserva confirmada',
              ),
            if (entrada.estado == 'EXPIRADO')
              _InfoEstadoFinal(
                icono: Icons.timer_off,
                color: Colors.red,
                texto: 'El tiempo de confirmación expiró',
              ),
            if (entrada.estado == 'CANCELADO')
              _InfoEstadoFinal(
                icono: Icons.cancel,
                color: Colors.grey,
                texto: 'Entrada cancelada',
              ),
          ],
        ),
      ),
    );
  }
}

class _BadgeEstado extends StatelessWidget {
  final String estado;
  final int? posicion;
  const _BadgeEstado({required this.estado, this.posicion});

  @override
  Widget build(BuildContext context) {
    final (color, texto) = switch (estado) {
      'ESPERANDO' =>
        (Colors.grey[600]!, posicion != null ? 'Pos. $posicion' : 'En espera'),
      'NOTIFICADO' => (Colors.orange, '¡Disponible!'),
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

class _InfoEstadoFinal extends StatelessWidget {
  final IconData icono;
  final Color color;
  final String texto;

  const _InfoEstadoFinal({
    required this.icono,
    required this.color,
    required this.texto,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icono, color: color, size: 18),
        const SizedBox(width: 6),
        Text(
          texto,
          style: TextStyle(color: color, fontWeight: FontWeight.w500),
        ),
      ],
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
      if (!_restante.isNegative) _tick();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_restante.isNegative) {
      return const Text(
        'Tiempo expirado',
        style: TextStyle(
            color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600),
      );
    }
    final h = _restante.inHours;
    final m = _restante.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = _restante.inSeconds.remainder(60).toString().padLeft(2, '0');
    final texto = h > 0 ? '${h}h $m:$s restantes' : '$m:$s restantes';

    return Text(
      texto,
      style: const TextStyle(
        color: Colors.orange,
        fontSize: 12,
        fontWeight: FontWeight.w600,
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
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Colors.grey[700]),
          ),
        ),
      ],
    );
  }
}

class _ListaVacia extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.queue, size: 72, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  'No estás en ninguna\nlista de espera',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.grey[500],
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Cuando una instalación esté llena, podrás\napuntarte a su lista de espera.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[400],
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
            Text(mensaje, textAlign: TextAlign.center),
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
