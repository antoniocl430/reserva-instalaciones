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
    // El backend devuelve el estado en minúscula: libre|ocupado|bloqueado|pasado.
    // Lo normalizamos a mayúscula para el resto de la app.
    return Slot(
      horaInicio: json['horaInicio']?.toString() ?? '',
      horaFin: json['horaFin']?.toString() ?? '',
      estado: (json['estado']?.toString() ?? 'libre').toUpperCase(),
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
  // "PASADO" (slot cuya hora ya pasó) se trata como no disponible, igual que bloqueado.
  bool get esBloqueado => estado == 'BLOQUEADO' || estado == 'PASADO';
  bool get esOcupado => estado == 'OCUPADO';
  bool get esPropio => estado == 'PROPIO';

  @override
  List<Object?> get props => [horaInicio, horaFin, estado, motivo, reservaId];
}
