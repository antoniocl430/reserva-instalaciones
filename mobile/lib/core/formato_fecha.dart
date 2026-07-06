/// Utilidades para normalizar los valores de fecha/hora que devuelve el backend.
///
/// El backend serializa `fecha`, `horaInicio` y `horaFin` como datetimes ISO
/// (UTC), p.ej. "2026-07-07T06:00:00.000Z". La app trabaja con cadenas simples
/// "YYYY-MM-DD" y "HH:MM" en hora local. Estas funciones convierten de forma
/// segura ambos formatos (aceptan también valores ya en formato simple).

String _dosDigitos(int n) => n.toString().padLeft(2, '0');

/// Devuelve una fecha en formato "YYYY-MM-DD" (hora local).
/// Acepta tanto un datetime ISO como una cadena "YYYY-MM-DD" ya formateada.
String normalizarFecha(dynamic valor) {
  if (valor == null) return '';
  final s = valor.toString();
  if (!s.contains('T')) return s; // ya viene como YYYY-MM-DD
  final dt = DateTime.tryParse(s)?.toLocal();
  if (dt == null) return s;
  return '${dt.year.toString().padLeft(4, '0')}-${_dosDigitos(dt.month)}-${_dosDigitos(dt.day)}';
}

/// Devuelve una hora en formato "HH:MM" (hora local).
/// Acepta tanto un datetime ISO como una cadena "HH:MM" o "HH:MM:SS".
String normalizarHora(dynamic valor) {
  if (valor == null) return '';
  final s = valor.toString();
  if (!s.contains('T')) {
    final partes = s.split(':');
    if (partes.length >= 2) {
      return '${partes[0].padLeft(2, '0')}:${partes[1].padLeft(2, '0')}';
    }
    return s;
  }
  final dt = DateTime.tryParse(s)?.toLocal();
  if (dt == null) return s;
  return '${_dosDigitos(dt.hour)}:${_dosDigitos(dt.minute)}';
}
