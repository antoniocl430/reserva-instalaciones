import 'package:equatable/equatable.dart';

class Instalacion extends Equatable {
  final String id;
  final String nombre;
  final String tipo;
  final String? descripcion;
  final String? horario;
  final bool activa;
  final double? mediaValoraciones;
  final int? numValoraciones;

  const Instalacion({
    required this.id,
    required this.nombre,
    required this.tipo,
    this.descripcion,
    this.horario,
    this.activa = true,
    this.mediaValoraciones,
    this.numValoraciones,
  });

  factory Instalacion.fromJson(Map<String, dynamic> json) {
    return Instalacion(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre']?.toString() ?? 'Instalación',
      tipo: json['tipo']?.toString() ?? '',
      descripcion: json['descripcion'] as String?,
      horario: json['horario'] as String?,
      activa: json['activa'] as bool? ?? true,
      // El backend usa "mediaValoracion" / "totalValoraciones"; aceptamos ambos nombres.
      mediaValoraciones: (json['mediaValoracion'] as num?)?.toDouble() ??
          (json['mediaValoraciones'] as num?)?.toDouble(),
      numValoraciones: (json['totalValoraciones'] as num?)?.toInt() ??
          (json['numValoraciones'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombre': nombre,
        'tipo': tipo,
        'descripcion': descripcion,
        'horario': horario,
        'activa': activa,
        'mediaValoraciones': mediaValoraciones,
        'numValoraciones': numValoraciones,
      };

  @override
  List<Object?> get props => [
        id,
        nombre,
        tipo,
        descripcion,
        horario,
        activa,
        mediaValoraciones,
        numValoraciones,
      ];
}
