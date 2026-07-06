import 'package:equatable/equatable.dart';

class Slot extends Equatable {
  final String horaInicio;
  final String horaFin;
  final String estado;
  final String? motivo;
  final String? reservaId;

  const Slot({
    required this.horaInicio,
    required this.horaFin,
    required this.estado,
    this.motivo,
    this.reservaId,
  });

  factory Slot.fromJson(Map<String, dynamic> json) {
    return Slot(
      horaInicio: json['horaInicio'] as String,
      horaFin: json['horaFin'] as String,
      estado: json['estado'] as String? ?? 'LIBRE',
      motivo: json['motivo'] as String?,
      reservaId: json['reservaId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'horaInicio': horaInicio,
        'horaFin': horaFin,
        'estado': estado,
        'motivo': motivo,
        'reservaId': reservaId,
      };

  bool get esLibre => estado == 'LIBRE';
  bool get esBloqueado => estado == 'BLOQUEADO';
  bool get esOcupado => estado == 'OCUPADO';
  bool get esPropio => estado == 'PROPIO';

  @override
  List<Object?> get props => [horaInicio, horaFin, estado, motivo, reservaId];
}
