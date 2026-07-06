import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/formato_fecha.dart';
import '../../repositories/reserva_repository.dart';

const _colorPrimario = Color(0xFF1565C0);

/// Pantalla de escaneo del QR de la pista para confirmar la asistencia a una
/// reserva. El QR (generado por el admin) codifica la URL /pistas/{id}.
class VerificarQrScreen extends StatefulWidget {
  const VerificarQrScreen({super.key});

  @override
  State<VerificarQrScreen> createState() => _VerificarQrScreenState();
}

class _VerificarQrScreenState extends State<VerificarQrScreen> {
  final _scannerCtrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final _repo = ReservaRepository();
  bool _procesando = false;

  @override
  void dispose() {
    _scannerCtrl.dispose();
    super.dispose();
  }

  /// Extrae el id de la instalación del contenido del QR (/pistas/{id}).
  String? _extraerInstalacionId(String? raw) {
    if (raw == null) return null;
    const marcador = '/pistas/';
    final idx = raw.indexOf(marcador);
    if (idx == -1) return null;
    final resto = raw.substring(idx + marcador.length);
    final id = resto.split(RegExp(r'[/?#]')).first.trim();
    return id.isEmpty ? null : id;
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_procesando) return;
    final raw = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    final instalacionId = _extraerInstalacionId(raw);

    if (instalacionId == null) {
      setState(() => _procesando = true);
      await _mostrarResultado(
        exito: false,
        titulo: 'QR no válido',
        mensaje: 'Este código no corresponde a una pista de la aplicación.',
      );
      return;
    }

    setState(() => _procesando = true);
    await _scannerCtrl.stop();

    try {
      final res = await _repo.confirmarAsistencia(instalacionId);
      final yaConfirmada = res['yaConfirmada'] == true;
      final reserva = res['reserva'] as Map<String, dynamic>?;
      final nombre = reserva?['instalacion']?['nombre']?.toString() ?? 'la instalación';
      final fecha = normalizarFecha(reserva?['horaInicio']);
      final hIni = normalizarHora(reserva?['horaInicio']);
      final hFin = normalizarHora(reserva?['horaFin']);

      await _mostrarResultado(
        exito: true,
        titulo: yaConfirmada ? 'Asistencia ya confirmada' : '¡Asistencia confirmada!',
        mensaje: yaConfirmada
            ? 'Ya habías confirmado tu asistencia a $nombre.'
            : 'Tu reserva en $nombre queda registrada como asistida.',
        detalle: '$fecha · $hIni - $hFin',
      );
    } catch (e) {
      await _mostrarResultado(
        exito: false,
        titulo: 'No se pudo confirmar',
        mensaje: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _mostrarResultado({
    required bool exito,
    required String titulo,
    required String mensaje,
    String? detalle,
  }) async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              exito ? Icons.check_circle : Icons.error_outline,
              color: exito ? Colors.green : Colors.red.shade400,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              titulo,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              mensaje,
              style: TextStyle(color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
            if (detalle != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F4FA),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  detalle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: _colorPrimario,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Volver a escanear'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: _colorPrimario),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      Navigator.of(context).pop();
                    },
                    child: const Text('Hecho'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    // Al cerrar el resultado con "Volver a escanear", reanudar la cámara.
    if (mounted) {
      setState(() => _procesando = false);
      await _scannerCtrl.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Confirmar asistencia'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(
            controller: _scannerCtrl,
            onDetect: _onDetect,
          ),
          // Marco visual de guía
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          Positioned(
            bottom: 48,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text(
                'Apunta al código QR de la pista para confirmar tu asistencia.',
                style: TextStyle(color: Colors.white, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
