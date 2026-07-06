import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../../models/usuario.dart';
import '../../providers/auth_provider.dart';
import '../../providers/perfil_provider.dart';

const _colorPrimario = Color(0xFF1565C0);

class PerfilScreen extends ConsumerWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perfilAsync = ref.watch(perfilProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Perfil'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () => _confirmarLogout(context, ref),
          ),
        ],
      ),
      body: perfilAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: _colorPrimario),
        ),
        error: (e, _) => _ErrorPerfil(
          mensaje: e.toString().replaceFirst('Exception: ', ''),
          onReintentar: () => ref.invalidate(perfilProvider),
        ),
        data: (usuario) => RefreshIndicator(
          color: _colorPrimario,
          onRefresh: () async => ref.invalidate(perfilProvider),
          child: _ContenidoPerfil(usuario: usuario, ref: ref),
        ),
      ),
    );
  }

  Future<void> _confirmarLogout(BuildContext context, WidgetRef ref) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que quieres cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );

    if (confirmar != true || !context.mounted) return;
    await ref.read(authProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }
}

class _ContenidoPerfil extends StatelessWidget {
  final Usuario usuario;
  final WidgetRef ref;

  const _ContenidoPerfil({required this.usuario, required this.ref});

  @override
  Widget build(BuildContext context) {
    final estaSuspendido = usuario.estaSuspendido;

    return ListView(
      children: [
        // Cabecera azul con avatar
        Container(
          color: _colorPrimario,
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          child: Column(
            children: [
              _Avatar(usuario: usuario),
              const SizedBox(height: 14),
              Text(
                usuario.nombre,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                usuario.email,
                style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
              ),
              const SizedBox(height: 12),
              _BadgeRol(rol: usuario.rol),
            ],
          ),
        ),
        // Banner de suspensión
        if (estaSuspendido)
          _BannerSuspension(
            hasta: usuario.suspendidoHasta!,
            motivo: usuario.motivoSuspension,
          ),
        const SizedBox(height: 8),
        // Sección Mi cuenta
        _SeccionTitulo(titulo: 'Mi cuenta'),
        ListTile(
          leading: const Icon(Icons.edit_outlined, color: _colorPrimario),
          title: const Text('Editar perfil'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/editar-perfil'),
        ),
        ListTile(
          leading: const Icon(Icons.calendar_month_outlined, color: _colorPrimario),
          title: const Text('Mis reservas'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/mis-reservas'),
        ),
        ListTile(
          leading: const Icon(Icons.queue_outlined, color: _colorPrimario),
          title: const Text('Lista de espera'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/lista-espera'),
        ),
        const Divider(height: 1),
        // Sección Estadísticas
        _SeccionTitulo(titulo: 'Estadísticas'),
        ListTile(
          leading: Icon(
            Icons.warning_amber_outlined,
            color: usuario.noShows > 0 ? Colors.red : Colors.grey,
          ),
          title: Text(
            'No-shows acumulados: ${usuario.noShows}',
            style: TextStyle(
              color: usuario.noShows > 0 ? Colors.red : null,
              fontWeight: usuario.noShows > 0 ? FontWeight.w600 : null,
            ),
          ),
          subtitle: usuario.noShows > 0
              ? const Text(
                  'Acumular 3 no-shows puede suspender tu cuenta',
                  style: TextStyle(color: Colors.red, fontSize: 12),
                )
              : null,
        ),
        const Divider(height: 1),
        // Sección Sesión
        _SeccionTitulo(titulo: 'Sesión'),
        ListTile(
          leading: const Icon(Icons.logout, color: Colors.red),
          title: const Text(
            'Cerrar sesión',
            style: TextStyle(color: Colors.red),
          ),
          onTap: () => _confirmarLogout(context, ref),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Future<void> _confirmarLogout(BuildContext context, WidgetRef ref) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que quieres cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );

    if (confirmar != true || !context.mounted) return;
    await ref.read(authProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }
}

class _Avatar extends StatelessWidget {
  final Usuario usuario;
  const _Avatar({required this.usuario});

  @override
  Widget build(BuildContext context) {
    final iniciales = usuario.nombre
        .split(' ')
        .take(2)
        .map((p) => p.isNotEmpty ? p[0].toUpperCase() : '')
        .join();

    if (usuario.avatarUrl != null && usuario.avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 48,
        backgroundColor: Colors.white,
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: usuario.avatarUrl!,
            width: 96,
            height: 96,
            fit: BoxFit.cover,
            placeholder: (_, __) => const CircularProgressIndicator(
              color: _colorPrimario,
            ),
            errorWidget: (_, __, ___) => _InicialesAvatar(iniciales: iniciales),
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: 48,
      backgroundColor: Colors.white,
      child: _InicialesAvatar(iniciales: iniciales),
    );
  }
}

class _InicialesAvatar extends StatelessWidget {
  final String iniciales;
  const _InicialesAvatar({required this.iniciales});

  @override
  Widget build(BuildContext context) {
    return Text(
      iniciales,
      style: const TextStyle(
        color: _colorPrimario,
        fontSize: 28,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}

class _BadgeRol extends StatelessWidget {
  final String rol;
  const _BadgeRol({required this.rol});

  @override
  Widget build(BuildContext context) {
    final etiqueta = switch (rol.toUpperCase()) {
      'ADMIN' => 'Administrador',
      'CIUDADANO' => 'Ciudadano',
      _ => rol,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white54),
      ),
      child: Text(
        etiqueta,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }
}

class _BannerSuspension extends StatelessWidget {
  final DateTime hasta;
  final String? motivo;

  const _BannerSuspension({required this.hasta, this.motivo});

  @override
  Widget build(BuildContext context) {
    final fechaStr = DateFormat('dd/MM/yyyy', 'es').format(hasta);
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade300),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.block, color: Colors.red, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cuenta suspendida hasta el $fechaStr',
                  style: const TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (motivo != null && motivo!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Motivo: $motivo',
                    style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SeccionTitulo extends StatelessWidget {
  final String titulo;
  const _SeccionTitulo({required this.titulo});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
      child: Text(
        titulo,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Colors.grey[600],
              letterSpacing: 0.8,
            ),
      ),
    );
  }
}

class _ErrorPerfil extends StatelessWidget {
  final String mensaje;
  final VoidCallback onReintentar;
  const _ErrorPerfil({required this.mensaje, required this.onReintentar});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(mensaje, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: FilledButton.styleFrom(backgroundColor: _colorPrimario),
              onPressed: onReintentar,
            ),
          ],
        ),
      ),
    );
  }
}

