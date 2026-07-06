import 'package:equatable/equatable.dart';
import 'instalacion.dart';

class Reserva extends Equatable {
  final String id;
  final Instalacion instalacion;
  final String fecha; // 'YYYY-MM-DD'
  final String horaInicio; // 'HH:MM'
  final String horaFin; // 'HH:MM'
  final String estado; // 'ACTIVA' | 'CANCELADA'
  final String? qrToken;
  final bool noShow;
  final DateTime? creadaEn;
  final bool? valorada;

  const Reserva({
    required this.id,
    required this.instalacion,
    required this.fecha,
    required this.horaInicio,
    required this.horaFin,
    required this.estado,
    this.qrToken,
    this.noShow = false,
    this.creadaEn,
    this.valorada,
  });

  factory Reserva.fromJson(Map<String, dynamic> json) {
    return Reserva(
      id: json['id']?.toString() ?? '',
      instalacion: Instalacion.fromJson(
        json['instalacion'] as Map<String, dynamic>? ?? {},
      ),
      fecha: json['fecha']?.toString() ?? '',
      horaInicio: json['horaInicio']?.toString() ??
          json['hora_inicio']?.toString() ??
          '',
      horaFin:
          json['horaFin']?.toString() ?? json['hora_fin']?.toString() ?? '',
      estado: json['estado']?.toString() ?? 'ACTIVA',
      qrToken: json['qrToken']?.toString() ?? json['qr_token']?.toString(),
      noShow: json['noShow'] as bool? ?? json['no_show'] as bool? ?? false,
      creadaEn: json['creadaEn'] != null
          ? DateTime.tryParse(json['creadaEn'].toString())
          : json['creada_en'] != null
              ? DateTime.tryParse(json['creada_en'].toString())
              : null,
      valorada: json['valorada'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'instalacion': instalacion.toJson(),
        'fecha': fecha,
        'horaInicio': horaInicio,
        'horaFin': horaFin,
        'estado': estado,
        'qrToken': qrToken,
        'noShow': noShow,
        'creadaEn': creadaEn?.toIso8601String(),
        'valorada': valorada,
      };

  /// Devuelve true si la reserva está en estado ACTIVA
  bool get estaActiva => estado.toUpperCase() == 'ACTIVA';

  /// Devuelve true si la reserva es futura (no ha pasado su hora de inicio)
  bool get esFutura {
    final hoy = DateTime.now();
    final partesFecha = fecha.split('-');
    if (partesFecha.length != 3) return false;
    final partesHora = horaInicio.split(':');
    if (partesHora.length < 2) return false;
    final fechaHora = DateTime(
      int.tryParse(partesFecha[0]) ?? hoy.year,
      int.tryParse(partesFecha[1]) ?? hoy.month,
      int.tryParse(partesFecha[2]) ?? hoy.day,
      int.tryParse(partesHora[0]) ?? 0,
      int.tryParse(partesHora[1]) ?? 0,
    );
    return fechaHora.isAfter(hoy);
  }

  /// Devuelve true si faltan más de 2h para la reserva (se puede cancelar)
  bool get sePuedeCancelar {
    final hoy = DateTime.now();
    final partesFecha = fecha.split('-');
    if (partesFecha.length != 3) return false;
    final partesHora = horaInicio.split(':');
    if (partesHora.length < 2) return false;
    final fechaHora = DateTime(
      int.tryParse(partesFecha[0]) ?? hoy.year,
      int.tryParse(partesFecha[1]) ?? hoy.month,
      int.tryParse(partesFecha[2]) ?? hoy.day,
      int.tryParse(partesHora[0]) ?? 0,
      int.tryParse(partesHora[1]) ?? 0,
    );
    return fechaHora.difference(hoy).inHours > 2;
  }

  @override
  List<Object?> get props =>
      [id, instalacion, fecha, horaInicio, horaFin, estado, qrToken, noShow, creadaEn, valorada];
}
