import 'package:flutter/material.dart';
import '../models/aviso.dart';

class AvisoCard extends StatelessWidget {
  const AvisoCard({super.key, required this.aviso});

  final Aviso aviso;

  Color _colorPorTipo(ColorScheme cs) {
    switch (aviso.tipo.toUpperCase()) {
      case 'URGENTE':
      case 'ALERTA':
        return cs.errorContainer;
      case 'MANTENIMIENTO':
        return Colors.orange.shade50;
      case 'INFO':
      default:
        return cs.secondaryContainer;
    }
  }

  Color _colorTextoPorTipo(ColorScheme cs) {
    switch (aviso.tipo.toUpperCase()) {
      case 'URGENTE':
      case 'ALERTA':
        return cs.onErrorContainer;
      case 'MANTENIMIENTO':
        return Colors.orange.shade900;
      case 'INFO':
      default:
        return cs.onSecondaryContainer;
    }
  }

  IconData _iconoPorTipo() {
    switch (aviso.tipo.toUpperCase()) {
      case 'URGENTE':
      case 'ALERTA':
        return Icons.warning_amber_rounded;
      case 'MANTENIMIENTO':
        return Icons.construction_rounded;
      case 'INFO':
      default:
        return Icons.info_outline_rounded;
    }
  }

  String _etiquetaPorTipo() {
    switch (aviso.tipo.toUpperCase()) {
      case 'URGENTE':
        return 'Urgente';
      case 'ALERTA':
        return 'Alerta';
      case 'MANTENIMIENTO':
        return 'Mantenimiento';
      case 'INFO':
      default:
        return 'Información';
    }
  }

  String _formatearFecha(DateTime fecha) {
    final ahora = DateTime.now();
    final diferencia = ahora.difference(fecha);
    if (diferencia.inMinutes < 60) {
      return 'Hace ${diferencia.inMinutes} min';
    } else if (diferencia.inHours < 24) {
      return 'Hace ${diferencia.inHours} h';
    } else if (diferencia.inDays < 7) {
      return 'Hace ${diferencia.inDays} días';
    }
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final bgColor = _colorPorTipo(colorScheme);
    final textColor = _colorTextoPorTipo(colorScheme);

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_iconoPorTipo(), color: textColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: textColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _etiquetaPorTipo(),
                        style: textTheme.labelSmall?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _formatearFecha(aviso.fecha),
                      style: textTheme.labelSmall?.copyWith(
                        color: textColor.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  aviso.titulo,
                  style: textTheme.titleSmall?.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  aviso.descripcion,
                  style: textTheme.bodySmall?.copyWith(
                    color: textColor.withOpacity(0.85),
                    height: 1.4,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
