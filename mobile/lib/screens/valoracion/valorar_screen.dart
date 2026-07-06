import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import '../../models/reserva.dart';
import '../../repositories/valoracion_repository.dart';

const _colorPrimario = Color(0xFF1565C0);
const _maxCharsComentario = 500;

final _valoracionRepositoryProvider = Provider<ValoracionRepository>((ref) {
  return ValoracionRepository();
});

class ValorarScreen extends ConsumerStatefulWidget {
  final String reservaId;
  final Reserva? reserva;

  const ValorarScreen({
    super.key,
    required this.reservaId,
    this.reserva,
  });

  @override
  ConsumerState<ValorarScreen> createState() => _ValorarScreenState();
}

class _ValorarScreenState extends ConsumerState<ValorarScreen> {
  double _puntuacion = 0;
  final _comentarioController = TextEditingController();
  bool _enviando = false;
  bool _yaValorada = false;

  @override
  void initState() {
    super.initState();
    if (widget.reserva?.valorada == true) {
      _yaValorada = true;
    }
  }

  @override
  void dispose() {
    _comentarioController.dispose();
    super.dispose();
  }

  Future<void> _enviarValoracion() async {
    if (_puntuacion == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor, selecciona una puntuación'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _enviando = true);

    try {
      await ref.read(_valoracionRepositoryProvider).enviarValoracion(
            widget.reservaId,
            _puntuacion.toInt(),
            _comentarioController.text.trim().isEmpty
                ? null
                : _comentarioController.text.trim(),
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Gracias por tu valoración!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _enviando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Valorar instalación'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
      ),
      body: _yaValorada
          ? _PantallaYaValorada(onVolver: () => context.pop())
          : _FormularioValoracion(
              reserva: widget.reserva,
              puntuacion: _puntuacion,
              comentarioController: _comentarioController,
              enviando: _enviando,
              onPuntuacionCambiada: (v) => setState(() => _puntuacion = v),
              onEnviar: _enviarValoracion,
            ),
    );
  }
}

class _PantallaYaValorada extends StatelessWidget {
  final VoidCallback onVolver;
  const _PantallaYaValorada({required this.onVolver});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline,
                size: 72, color: Colors.green),
            const SizedBox(height: 20),
            Text(
              'Ya has valorado esta reserva',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Gracias por compartir tu experiencia.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              icon: const Icon(Icons.arrow_back),
              label: const Text('Volver'),
              style: FilledButton.styleFrom(backgroundColor: _colorPrimario),
              onPressed: onVolver,
            ),
          ],
        ),
      ),
    );
  }
}

class _FormularioValoracion extends StatefulWidget {
  final Reserva? reserva;
  final double puntuacion;
  final TextEditingController comentarioController;
  final bool enviando;
  final ValueChanged<double> onPuntuacionCambiada;
  final VoidCallback onEnviar;

  const _FormularioValoracion({
    this.reserva,
    required this.puntuacion,
    required this.comentarioController,
    required this.enviando,
    required this.onPuntuacionCambiada,
    required this.onEnviar,
  });

  @override
  State<_FormularioValoracion> createState() => _FormularioValoracionState();
}

class _FormularioValoracionState extends State<_FormularioValoracion> {
  int _charsComentario = 0;

  @override
  void initState() {
    super.initState();
    widget.comentarioController.addListener(() {
      if (mounted) {
        setState(() {
          _charsComentario = widget.comentarioController.text.length;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info de la instalación
          if (widget.reserva != null) ...[
            Card(
              elevation: 0,
              color: _colorPrimario.withOpacity(0.07),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.sports, color: _colorPrimario),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.reserva!.instalacion.nombre,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.reserva!.fecha} · ${widget.reserva!.horaInicio}–${widget.reserva!.horaFin}',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
          ],
          // Pregunta
          Text(
            '¿Cómo fue tu experiencia?',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'Tu opinión nos ayuda a mejorar las instalaciones.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
          const SizedBox(height: 24),
          // Estrellas
          Center(
            child: Column(
              children: [
                RatingBar.builder(
                  initialRating: widget.puntuacion,
                  minRating: 1,
                  direction: Axis.horizontal,
                  allowHalfRating: false,
                  itemCount: 5,
                  itemSize: 48,
                  itemPadding: const EdgeInsets.symmetric(horizontal: 4),
                  itemBuilder: (context, _) => const Icon(
                    Icons.star_rounded,
                    color: Colors.amber,
                  ),
                  onRatingUpdate: widget.onPuntuacionCambiada,
                ),
                const SizedBox(height: 8),
                if (widget.puntuacion > 0)
                  Text(
                    _etiquetaPuntuacion(widget.puntuacion.toInt()),
                    style: TextStyle(
                      color: _colorEstrellas(widget.puntuacion.toInt()),
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          // Comentario
          Text(
            'Comentario (opcional)',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: widget.comentarioController,
            maxLength: _maxCharsComentario,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Cuéntanos tu experiencia...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              counterText: '$_charsComentario / $_maxCharsComentario',
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _colorPrimario, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 32),
          // Botón enviar
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _colorPrimario,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: widget.enviando ? null : widget.onEnviar,
              child: widget.enviando
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      'Enviar valoración',
                      style: TextStyle(fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  String _etiquetaPuntuacion(int p) => switch (p) {
        1 => 'Muy mala',
        2 => 'Mala',
        3 => 'Regular',
        4 => 'Buena',
        5 => 'Excelente',
        _ => '',
      };

  Color _colorEstrellas(int p) => switch (p) {
        1 || 2 => Colors.red,
        3 => Colors.orange,
        4 || 5 => Colors.green,
        _ => Colors.grey,
      };
}
