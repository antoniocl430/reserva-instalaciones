import 'package:equatable/equatable.dart';

class Aviso extends Equatable {
  final String id;
  final String titulo;
  final String descripcion;
  final String tipo;
  final DateTime fecha;

  const Aviso({
    required this.id,
    required this.titulo,
    required this.descripcion,
    required this.tipo,
    required this.fecha,
  });

  factory Aviso.fromJson(Map<String, dynamic> json) {
    return Aviso(
      id: json['id'] as String,
      titulo: json['titulo'] as String,
      descripcion: json['descripcion'] as String,
      tipo: json['tipo'] as String? ?? 'INFO',
      fecha: DateTime.parse(
          (json['fecha'] ?? json['creadaEn'] ?? DateTime.now().toIso8601String()) as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'titulo': titulo,
        'descripcion': descripcion,
        'tipo': tipo,
        'fecha': fecha.toIso8601String(),
      };

  @override
  List<Object?> get props => [id, titulo, descripcion, tipo, fecha];
}
