import 'package:equatable/equatable.dart';

class Usuario extends Equatable {
  final String id;
  final String nombre;
  final String email;
  final String rol;
  final String? avatarUrl;
  final int noShows;
  final DateTime? suspendidoHasta;
  final String? motivoSuspension;
  final bool emailVerificado;

  const Usuario({
    required this.id,
    required this.nombre,
    required this.email,
    required this.rol,
    this.avatarUrl,
    this.noShows = 0,
    this.suspendidoHasta,
    this.motivoSuspension,
    this.emailVerificado = false,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      id: json['id'] as String,
      nombre: json['nombre'] as String,
      email: json['email'] as String,
      rol: json['rol'] as String? ?? 'CIUDADANO',
      avatarUrl: json['avatarUrl'] as String?,
      noShows: (json['noShows'] as num?)?.toInt() ?? 0,
      suspendidoHasta: json['suspendidoHasta'] != null
          ? DateTime.parse(json['suspendidoHasta'] as String)
          : null,
      motivoSuspension: json['motivoSuspension'] as String?,
      emailVerificado: json['emailVerificado'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombre': nombre,
        'email': email,
        'rol': rol,
        'avatarUrl': avatarUrl,
        'noShows': noShows,
        'suspendidoHasta': suspendidoHasta?.toIso8601String(),
        'motivoSuspension': motivoSuspension,
        'emailVerificado': emailVerificado,
      };

  Usuario copyWith({
    String? id,
    String? nombre,
    String? email,
    String? rol,
    String? avatarUrl,
    int? noShows,
    DateTime? suspendidoHasta,
    String? motivoSuspension,
    bool? emailVerificado,
  }) {
    return Usuario(
      id: id ?? this.id,
      nombre: nombre ?? this.nombre,
      email: email ?? this.email,
      rol: rol ?? this.rol,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      noShows: noShows ?? this.noShows,
      suspendidoHasta: suspendidoHasta ?? this.suspendidoHasta,
      motivoSuspension: motivoSuspension ?? this.motivoSuspension,
      emailVerificado: emailVerificado ?? this.emailVerificado,
    );
  }

  bool get estaSuspendido {
    if (suspendidoHasta == null) return false;
    return suspendidoHasta!.isAfter(DateTime.now());
  }

  @override
  List<Object?> get props => [
        id,
        nombre,
        email,
        rol,
        avatarUrl,
        noShows,
        suspendidoHasta,
        motivoSuspension,
        emailVerificado,
      ];
}
