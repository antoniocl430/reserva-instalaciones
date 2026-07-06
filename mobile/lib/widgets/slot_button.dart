import 'package:flutter/material.dart';
import '../models/slot.dart';

class SlotButton extends StatelessWidget {
  const SlotButton({
    super.key,
    required this.slot,
    required this.onTap,
  });

  final Slot slot;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    Color bgColor;
    Color textColor;
    Color borderColor;
    String etiqueta;
    bool enabled = true;

    if (slot.esLibre) {
      bgColor = colorScheme.primaryContainer;
      textColor = colorScheme.onPrimaryContainer;
      borderColor = colorScheme.primary.withOpacity(0.3);
      etiqueta = 'Libre';
    } else if (slot.esPropio) {
      bgColor = Colors.green.shade50;
      textColor = Colors.green.shade800;
      borderColor = Colors.green.shade300;
      etiqueta = 'Tu reserva';
    } else if (slot.esOcupado) {
      bgColor = colorScheme.errorContainer.withOpacity(0.5);
      textColor = colorScheme.onErrorContainer;
      borderColor = colorScheme.error.withOpacity(0.2);
      etiqueta = 'Ocupado';
      enabled = false;
    } else {
      // BLOQUEADO u otro
      bgColor = colorScheme.surfaceVariant;
      textColor = colorScheme.onSurfaceVariant;
      borderColor = colorScheme.outline.withOpacity(0.3);
      etiqueta = 'No disponible';
      enabled = false;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${slot.horaInicio} - ${slot.horaFin}',
                style: textTheme.labelMedium?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: textColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  etiqueta,
                  style: textTheme.labelSmall?.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
