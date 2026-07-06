import 'package:flutter/material.dart';

class StarRatingWidget extends StatelessWidget {
  final double puntuacion;
  final double tamano;
  final int maxEstrellas;

  const StarRatingWidget({
    super.key,
    required this.puntuacion,
    this.tamano = 16,
    this.maxEstrellas = 5,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(maxEstrellas, (i) {
        final valor = i + 1;
        IconData icono;
        if (puntuacion >= valor) {
          icono = Icons.star_rounded;
        } else if (puntuacion >= valor - 0.5) {
          icono = Icons.star_half_rounded;
        } else {
          icono = Icons.star_outline_rounded;
        }
        return Icon(
          icono,
          size: tamano,
          color: Colors.amber.shade600,
        );
      }),
    );
  }
}
