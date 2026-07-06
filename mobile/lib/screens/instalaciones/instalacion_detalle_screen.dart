import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../models/instalacion.dart';
import '../../models/slot.dart';
import '../../providers/instalacion_provider.dart';
import '../../repositories/lista_espera_repository.dart';
import '../../repositories/reserva_repository.dart';
import '../../widgets/instalacion_card.dart';
import '../../widgets/slot_button.dart';

class InstalacionDetalleScreen extends ConsumerStatefulWidget {
  const InstalacionDetalleScreen({
    super.key,
    required this.instalacion,
  });

  final Instalacion instalacion;

  @override
  ConsumerState<InstalacionDetalleScreen> createState() =>
      _InstalacionDetalleScreenState();
}

class _InstalacionDetalleScreenState
    extends ConsumerState<InstalacionDetalleScreen> {
  DateTime _fechaSeleccionada = DateTime.now();
  DateTime _focusMes = DateTime.now();

  String _fechaAString(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final icono = InstalacionCard.iconoPorTipo(widget.instalacion.tipo);

    final disponibilidadAsync = ref.watch(
      disponibilidadProvider((
        instalacionId: widget.instalacion.id,
        fecha: _fechaAString(_fechaSeleccionada),
      )),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.instalacion.nombre,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: CustomScrollView(
        slivers: [
          // ─── Header de la instalación ──────────────────────────────────
          SliverToBoxAdapter(
            child: _HeaderInstalacion(
              instalacion: widget.instalacion,
              icono: icono,
              colorScheme: colorScheme,
              textTheme: textTheme,
            ),
          ),

          // ─── Calendario ───────────────────────────────────────────────
          SliverToBoxAdapter(
            child: _CalendarioSection(
              fechaSeleccionada: _fechaSeleccionada,
              focusMes: _focusMes,
              colorScheme: colorScheme,
              textTheme: textTheme,
              onDiaSeleccionado: (dia) {
                setState(() {
                  _fechaSeleccionada = dia;
                  _focusMes = dia;
                });
              },
            ),
          ),

          // ─── Slots de disponibilidad ───────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  Icon(Icons.access_time,
                      size: 18, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Horarios disponibles',
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),

          disponibilidadAsync.when(
            loading: () => const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (e, _) => SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _ErrorDisponibilidad(
                  onReintentar: () => ref.invalidate(disponibilidadProvider),
                ),
              ),
            ),
            data: (slots) {
              if (slots.isEmpty) {
                return const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.event_busy_outlined, size: 48),
                        SizedBox(height: 12),
                        Text(
                          'No hay horarios disponibles\npara este día',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverGrid.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 2.4,
                  children: slots.map((slot) {
                    return SlotButton(
                      slot: slot,
                      onTap: slot.esLibre
                          ? () => _mostrarConfirmarReserva(context, slot)
                          : slot.esOcupado
                              ? () => _mostrarListaEspera(context, slot)
                              : null,
                    );
                  }).toList(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _mostrarConfirmarReserva(BuildContext context, Slot slot) async {
    await showDialog<void>(
      context: context,
      builder: (_) => _ConfirmarReservaDialog(
        instalacion: widget.instalacion,
        slot: slot,
        fecha: _fechaSeleccionada,
        onConfirmado: () {
          // Invalidar para refrescar disponibilidad
          ref.invalidate(disponibilidadProvider);
        },
      ),
    );
  }

  Future<void> _mostrarListaEspera(BuildContext context, Slot slot) async {
    final confirma = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Slot ocupado'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'El horario ${slot.horaInicio} - ${slot.horaFin} está ocupado.',
            ),
            const SizedBox(height: 12),
            const Text(
              '¿Quieres apuntarte a la lista de espera? Te avisaremos si se libera una plaza.',
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Apuntarme'),
          ),
        ],
      ),
    );

    if (confirma == true && context.mounted) {
      try {
        await ListaEsperaRepository().unirseListaEspera(
          widget.instalacion.id,
          _fechaAString(_fechaSeleccionada),
          slot.horaInicio,
        );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Te has apuntado a la lista de espera'),
              backgroundColor: Colors.blue,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceFirst('Exception: ', '')),
              backgroundColor: Theme.of(context).colorScheme.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }
}

// ─── Header instalación ───────────────────────────────────────────────────────

class _HeaderInstalacion extends StatelessWidget {
  const _HeaderInstalacion({
    required this.instalacion,
    required this.icono,
    required this.colorScheme,
    required this.textTheme,
  });

  final Instalacion instalacion;
  final IconData icono;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Banner superior
        Container(
          width: double.infinity,
          color: colorScheme.primaryContainer,
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Icon(icono, size: 64, color: colorScheme.primary),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Nombre y tipo
              Row(
                children: [
                  Expanded(
                    child: Text(
                      instalacion.nombre,
                      style: textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: colorScheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      instalacion.tipo,
                      style: textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSecondaryContainer,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Valoraciones
              if (instalacion.mediaValoraciones != null) ...[
                Row(
                  children: [
                    ...List.generate(5, (i) {
                      final llena =
                          i < (instalacion.mediaValoraciones ?? 0).floor();
                      final media =
                          !llena && i < (instalacion.mediaValoraciones ?? 0);
                      return Icon(
                        media
                            ? Icons.star_half_rounded
                            : llena
                                ? Icons.star_rounded
                                : Icons.star_outline_rounded,
                        size: 18,
                        color: Colors.amber.shade600,
                      );
                    }),
                    const SizedBox(width: 6),
                    Text(
                      instalacion.mediaValoraciones!.toStringAsFixed(1),
                      style: textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (instalacion.numValoraciones != null) ...[
                      const SizedBox(width: 4),
                      Text(
                        '(${instalacion.numValoraciones} valoraciones)',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 10),
              ],

              // Descripción
              if (instalacion.descripcion != null &&
                  instalacion.descripcion!.isNotEmpty) ...[
                Text(
                  instalacion.descripcion!,
                  style: textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // Horario
              if (instalacion.horario != null &&
                  instalacion.horario!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.schedule,
                          size: 18, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          instalacion.horario!,
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}

// ─── Sección calendario ───────────────────────────────────────────────────────

class _CalendarioSection extends StatelessWidget {
  const _CalendarioSection({
    required this.fechaSeleccionada,
    required this.focusMes,
    required this.colorScheme,
    required this.textTheme,
    required this.onDiaSeleccionado,
  });

  final DateTime fechaSeleccionada;
  final DateTime focusMes;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final void Function(DateTime) onDiaSeleccionado;

  @override
  Widget build(BuildContext context) {
    final hoy = DateTime.now();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(
            children: [
              Icon(Icons.calendar_today, size: 18, color: colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Selecciona una fecha',
                style: textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        TableCalendar(
          locale: 'es_ES',
          firstDay: hoy,
          lastDay: hoy.add(const Duration(days: 90)),
          focusedDay: focusMes,
          selectedDayPredicate: (day) => isSameDay(day, fechaSeleccionada),
          onDaySelected: (selected, focused) => onDiaSeleccionado(selected),
          onPageChanged: (focused) {},
          calendarFormat: CalendarFormat.month,
          headerStyle: HeaderStyle(
            formatButtonVisible: false,
            titleCentered: true,
            titleTextStyle: textTheme.titleSmall!
                .copyWith(fontWeight: FontWeight.w600),
          ),
          calendarStyle: CalendarStyle(
            todayDecoration: BoxDecoration(
              color: colorScheme.secondaryContainer,
              shape: BoxShape.circle,
            ),
            todayTextStyle:
                TextStyle(color: colorScheme.onSecondaryContainer),
            selectedDecoration: BoxDecoration(
              color: colorScheme.primary,
              shape: BoxShape.circle,
            ),
            selectedTextStyle:
                TextStyle(color: colorScheme.onPrimary),
            outsideDaysVisible: false,
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}

// ─── Error disponibilidad ─────────────────────────────────────────────────────

class _ErrorDisponibilidad extends StatelessWidget {
  const _ErrorDisponibilidad({required this.onReintentar});
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
            'No se pudo cargar la disponibilidad',
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

// ─── Dialog confirmar reserva ─────────────────────────────────────────────────

class _ConfirmarReservaDialog extends ConsumerStatefulWidget {
  const _ConfirmarReservaDialog({
    required this.instalacion,
    required this.slot,
    required this.fecha,
    required this.onConfirmado,
  });

  final Instalacion instalacion;
  final Slot slot;
  final DateTime fecha;
  final VoidCallback onConfirmado;

  @override
  ConsumerState<_ConfirmarReservaDialog> createState() =>
      _ConfirmarReservaDialogState();
}

class _ConfirmarReservaDialogState
    extends ConsumerState<_ConfirmarReservaDialog> {
  bool _cargando = false;

  String _formatearFecha(DateTime d) {
    const dias = [
      'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'
    ];
    const meses = [
      '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return '${dias[d.weekday - 1]}, ${d.day} de ${meses[d.month]}';
  }

  String _fechaAString(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _confirmar() async {
    setState(() => _cargando = true);
    try {
      await ReservaRepository().crearReserva(
        widget.instalacion.id,
        _fechaAString(widget.fecha),
        widget.slot.horaInicio,
        widget.slot.horaFin,
      );
      if (mounted) {
        Navigator.of(context).pop();
        widget.onConfirmado();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Reserva confirmada con éxito!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        // Navegar a mis reservas
        context.push('/mis-reservas');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _cargando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Icon(Icons.event_available, color: colorScheme.primary),
          const SizedBox(width: 8),
          const Text('Confirmar reserva'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Revisa los detalles de tu reserva:'),
          const SizedBox(height: 16),
          _FilaResumen(
            icono: Icons.stadium_outlined,
            etiqueta: 'Instalación',
            valor: widget.instalacion.nombre,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 8),
          _FilaResumen(
            icono: Icons.calendar_today_outlined,
            etiqueta: 'Fecha',
            valor: _formatearFecha(widget.fecha),
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 8),
          _FilaResumen(
            icono: Icons.access_time_outlined,
            etiqueta: 'Horario',
            valor: '${widget.slot.horaInicio} - ${widget.slot.horaFin}',
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline,
                    size: 16, color: colorScheme.onPrimaryContainer),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Recuerda que debes presentarte a tu hora. Las ausencias reiteradas pueden limitar tu acceso.',
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.onPrimaryContainer,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _cargando ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _cargando ? null : _confirmar,
          child: _cargando
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Confirmar reserva'),
        ),
      ],
    );
  }
}

class _FilaResumen extends StatelessWidget {
  const _FilaResumen({
    required this.icono,
    required this.etiqueta,
    required this.valor,
    required this.colorScheme,
    required this.textTheme,
  });

  final IconData icono;
  final String etiqueta;
  final String valor;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icono, size: 18, color: colorScheme.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                etiqueta,
                style: textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                valor,
                style: textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
