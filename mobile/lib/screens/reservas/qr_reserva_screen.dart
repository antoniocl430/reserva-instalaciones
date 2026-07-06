import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:intl/intl.dart';
import '../../models/reserva.dart';

const _colorPrimario = Color(0xFF1565C0);

class QrReservaScreen extends StatelessWidget {
  final String qrToken;
  final Reserva? reserva;

  const QrReservaScreen({
    super.key,
    required this.qrToken,
    this.reserva,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        title: const Text('Mi código QR'),
        backgroundColor: const Color(0xFF1A1A2E),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Tarjeta del QR
                Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxWidth: 380),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: _colorPrimario.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    children: [
                      // Cabecera
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.sports, color: _colorPrimario, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Reserva deportiva municipal',
                            style: TextStyle(
                              color: _colorPrimario,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      // QR
                      QrImageView(
                        data: qrToken,
                        version: QrVersions.auto,
                        size: 250,
                        backgroundColor: Colors.white,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: Color(0xFF1565C0),
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Instrucción
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: _colorPrimario.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.info_outline,
                              size: 16,
                              color: _colorPrimario,
                            ),
                            const SizedBox(width: 8),
                            const Flexible(
                              child: Text(
                                'Muestra este código en la entrada',
                                style: TextStyle(
                                  color: _colorPrimario,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Detalles de la reserva
                      if (reserva != null) ...[
                        const SizedBox(height: 20),
                        const Divider(),
                        const SizedBox(height: 12),
                        _DetalleReserva(reserva: reserva!),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                // Botón volver
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.arrow_back, color: Colors.white70),
                    label: const Text(
                      'Volver',
                      style: TextStyle(color: Colors.white70),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white30),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => context.pop(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DetalleReserva extends StatelessWidget {
  final Reserva reserva;
  const _DetalleReserva({required this.reserva});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _FilaDetalle(
          icono: Icons.location_on_outlined,
          label: 'Instalación',
          valor: reserva.instalacion.nombre,
        ),
        const SizedBox(height: 8),
        _FilaDetalle(
          icono: Icons.calendar_today_outlined,
          label: 'Fecha',
          valor: _formatearFecha(reserva.fecha),
        ),
        const SizedBox(height: 8),
        _FilaDetalle(
          icono: Icons.access_time,
          label: 'Hora',
          valor: '${reserva.horaInicio} – ${reserva.horaFin}',
        ),
      ],
    );
  }

  String _formatearFecha(String fecha) {
    try {
      final dt = DateTime.parse(fecha);
      return DateFormat('dd/MM/yyyy', 'es').format(dt);
    } catch (_) {
      return fecha;
    }
  }
}

class _FilaDetalle extends StatelessWidget {
  final IconData icono;
  final String label;
  final String valor;

  const _FilaDetalle({
    required this.icono,
    required this.label,
    required this.valor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icono, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 13,
          ),
        ),
        Expanded(
          child: Text(
            valor,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: Colors.black87,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
