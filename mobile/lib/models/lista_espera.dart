import 'package:equatable/equatable.dart';
import '../core/formato_fecha.dart';
import 'instalacion.dart';

class ListaEspera extends Equatable {
  final String id;
  final Instalacion instalacion;
  final String fecha; // 'YYYY-MM-DD'
  final String horaInicio; // 'HH:MM'
  final String horaFin; // 'HH:MM'
  final String estado; // 'ESPERANDO' | 'NOTIFICADO' | 'CONFIRMADO' | 'EXPIRADO' | 'CANCELADO'
  final int? posicion;
  final DateTime? expiraEn;
  final DateTime? creadaEn;

  const ListaEspera({
    required this.id,
    required this.instalacion,
    required this.fecha,
    required this.horaInicio,
    required this.horaFin,
    required this.estado,
    this.posicion,
    this.expiraEn,
    this.creadaEn,
  });

  factory ListaEspera.fromJson(Map<String, dynamic> json) {
    return ListaEspera(
      id: json['id']?.toString() ?? '',
      instalacion: Instalacion.fromJson(
        json['instalacion'] as Map<String, dynamic>? ?? {},
      ),
      fecha: normalizarFecha(json['fecha']),
      horaInicio: normalizarHora(json['horaInicio'] ?? json['hora_inicio']),
      horaFin: normalizarHora(json['horaFin'] ?? json['hora_fin']),
      estado: json['estado']?.toString() ?? 'ESPERANDO',
      posicion: (json['posicion'] as num?)?.toInt(),
      expiraEn: json['expiraEn'] != null
          ? DateTime.tryParse(json['expiraEn'].toString())
          : json['expira_en'] != null
              ? DateTime.tryParse(json['expira_en'].toString())
              : null,
      creadaEn: json['creadaEn'] != null
          ? DateTime.tryParse(json['creadaEn'].toString())
          : json['creada_en'] != null
              ? DateTime.tryParse(json['creada_en'].toString())
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'instalacion': instalacion.toJson(),
        'fecha': fecha,
        'horaInicio': horaInicio,
        'horaFin': horaFin,
        'estado': estado,
        'posicion': posicion,
        'expiraEn': expiraEn?.toIso8601String(),
        'creadaEn': creadaEn?.toIso8601String(),
      };

  @override
  List<Object?> get props =>
      [id, instalacion, fecha, horaInicio, horaFin, estado, posicion, expiraEn, creadaEn];
}
