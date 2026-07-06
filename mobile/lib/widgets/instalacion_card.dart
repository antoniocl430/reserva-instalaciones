import 'package:flutter/material.dart';
import '../models/instalacion.dart';

class InstalacionCard extends StatelessWidget {
  const InstalacionCard({
    super.key,
    required this.instalacion,
    required this.onTap,
    this.compact = false,
  });

  final Instalacion instalacion;
  final VoidCallback onTap;
  final bool compact;

  static IconData iconoPorTipo(String tipo) {
    switch (tipo.toUpperCase()) {
      case 'PISCINA':
        return Icons.pool;
      case 'TENIS':
      case 'PADEL':
        return Icons.sports_tennis;
      case 'FUTBOL':
      case 'FÚTBOL':
        return Icons.sports_soccer;
      case 'BALONCESTO':
        return Icons.sports_basketball;
      case 'VOLEIBOL':
        return Icons.sports_volleyball;
      case 'GIMNASIO':
        return Icons.fitness_center;
      case 'ATLETISMO':
        return Icons.directions_run;
      default:
        return Icons.stadium;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final icono = iconoPorTipo(instalacion.tipo);

    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        child: compact
            ? _CompactLayout(
                instalacion: instalacion,
                colorScheme: colorScheme,
                textTheme: textTheme,
                icono: icono,
              )
            : _FullLayout(
                instalacion: instalacion,
                colorScheme: colorScheme,
                textTheme: textTheme,
                icono: icono,
              ),
      ),
    );
  }
}

class _CompactLayout extends StatelessWidget {
  const _CompactLayout({
    required this.instalacion,
    required this.colorScheme,
    required this.textTheme,
    required this.icono,
  });

  final Instalacion instalacion;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final IconData icono;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 100,
            color: colorScheme.primaryContainer,
            child: Center(
              child: Icon(icono, size: 44, color: colorScheme.primary),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  instalacion.nombre,
                  style: textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    instalacion.tipo,
                    style: textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSecondaryContainer,
                    ),
                  ),
                ),
                if (instalacion.mediaValoraciones != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.star_rounded,
                          size: 14, color: Colors.amber.shade600),
                      const SizedBox(width: 3),
                      Text(
                        instalacion.mediaValoraciones!.toStringAsFixed(1),
                        style: textTheme.labelSmall,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FullLayout extends StatelessWidget {
  const _FullLayout({
    required this.instalacion,
    required this.colorScheme,
    required this.textTheme,
    required this.icono,
  });

  final Instalacion instalacion;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final IconData icono;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icono, size: 30, color: colorScheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  instalacion.nombre,
                  style: textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        instalacion.tipo,
                        style: textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSecondaryContainer,
                        ),
                      ),
                    ),
                    if (instalacion.mediaValoraciones != null) ...[
                      const SizedBox(width: 8),
                      Icon(Icons.star_rounded,
                          size: 14, color: Colors.amber.shade600),
                      const SizedBox(width: 3),
                      Text(
                        instalacion.mediaValoraciones!.toStringAsFixed(1),
                        style: textTheme.labelSmall,
                      ),
                      if (instalacion.numValoraciones != null)
                        Text(
                          ' (${instalacion.numValoraciones})',
                          style: textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ],
                ),
                if (instalacion.horario != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.schedule,
                          size: 13, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          instalacion.horario!,
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: colorScheme.onSurfaceVariant,
          ),
        ],
      ),
    );
  }
}
