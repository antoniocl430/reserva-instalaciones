import 'package:equatable/equatable.dart';

class Tenant extends Equatable {
  final String id;
  final String slug;
  final String nombre;
  final String municipio;
  final String? logoUrl;

  const Tenant({
    required this.id,
    required this.slug,
    required this.nombre,
    required this.municipio,
    this.logoUrl,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'] as String,
      slug: json['slug'] as String,
      nombre: json['nombre'] as String,
      municipio: json['municipio'] as String? ?? '',
      logoUrl: json['logoUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'nombre': nombre,
        'municipio': municipio,
        'logoUrl': logoUrl,
      };

  @override
  List<Object?> get props => [id, slug, nombre, municipio, logoUrl];
}
