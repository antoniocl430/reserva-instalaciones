import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/reserva.dart';

class ReservaCard extends StatelessWidget {
  final Reserva reserva;
  final VoidCallback? onCancelar;

  const ReservaCard({super.key, required this.reserva, this.onCancelar});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final estaActiva = reserva.estaActiva;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
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
                    style: textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                _BadgeEstado(estado: reserva.estado),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 14, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(
                  _formatearFecha(reserva.fecha),
                  style: textTheme.bodySmall,
                ),
                const SizedBox(width: 12),
                Icon(Icons.access_time_outlined,
                    size: 14, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(
                  '${reserva.horaInicio} - ${reserva.horaFin}',
                  style: textTheme.bodySmall,
                ),
              ],
            ),
            if (reserva.noShow) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      size: 14, color: Colors.orange.shade700),
                  const SizedBox(width: 4),
                  Text(
                    'No presentado',
                    style: textTheme.labelSmall?.copyWith(
                        color: Colors.orange.shade700),
                  ),
                ],
              ),
            ],
            if (estaActiva) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (reserva.qrToken != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => context.push(
                          '/qr/${reserva.qrToken}',
                          extra: {
                            'instalacion': reserva.instalacion.nombre,
                            'fecha': reserva.fecha,
                            'hora':
                                '${reserva.horaInicio} - ${reserva.horaFin}',
                          },
                        ),
                        icon: const Icon(Icons.qr_code, size: 16),
                        label: const Text('Ver QR'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ),
                  if (reserva.qrToken != null) const SizedBox(width: 8),
                  if (reserva.sePuedeCancelar && onCancelar != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onCancelar,
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        label: const Text('Cancelar'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: colorScheme.error,
                          side: BorderSide(color: colorScheme.error),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
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

  String _formatearFecha(String fecha) {
    final partes = fecha.split('-');
    if (partes.length != 3) return fecha;
    const meses = [
      '', 'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    final mes = int.tryParse(partes[1]) ?? 0;
    return '${partes[2]} ${mes < meses.length ? meses[mes] : partes[1]}. ${partes[0]}';
  }
}

class _BadgeEstado extends StatelessWidget {
  final String estado;
  const _BadgeEstado({required this.estado});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color textColor;
    String etiqueta;

    switch (estado.toUpperCase()) {
      case 'ACTIVA':
        color = Colors.green.shade100;
        textColor = Colors.green.shade800;
        etiqueta = 'Activa';
        break;
      case 'CANCELADA':
        color = Colors.red.shade100;
        textColor = Colors.red.shade800;
        etiqueta = 'Cancelada';
        break;
      default:
        color = Colors.grey.shade200;
        textColor = Colors.grey.shade700;
        etiqueta = estado;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        etiqueta,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
