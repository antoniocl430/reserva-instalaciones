import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/perfil_provider.dart';

const _colorPrimario = Color(0xFF1565C0);

class EditarPerfilScreen extends ConsumerStatefulWidget {
  const EditarPerfilScreen({super.key});

  @override
  ConsumerState<EditarPerfilScreen> createState() => _EditarPerfilScreenState();
}

class _EditarPerfilScreenState extends ConsumerState<EditarPerfilScreen> {
  // Formulario nombre
  final _formNombreKey = GlobalKey<FormState>();
  final _nombreController = TextEditingController();
  bool _guardandoNombre = false;

  // Formulario contraseña
  final _formPasswordKey = GlobalKey<FormState>();
  final _passwordActualController = TextEditingController();
  final _passwordNuevaController = TextEditingController();
  final _passwordConfirmController = TextEditingController();
  bool _verPasswordActual = false;
  bool _verPasswordNueva = false;
  bool _verPasswordConfirm = false;
  bool _cambiandoPassword = false;

  @override
  void initState() {
    super.initState();
    // Prellena el nombre con el valor actual
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final perfilState = ref.read(perfilProvider);
      perfilState.whenData((u) {
        _nombreController.text = u.nombre;
      });
    });
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _passwordActualController.dispose();
    _passwordNuevaController.dispose();
    _passwordConfirmController.dispose();
    super.dispose();
  }

  Future<void> _guardarNombre() async {
    if (!_formNombreKey.currentState!.validate()) return;
    setState(() => _guardandoNombre = true);

    try {
      await ref
          .read(perfilRepositoryProvider)
          .actualizarNombre(_nombreController.text.trim());
      ref.invalidate(perfilProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nombre actualizado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _guardandoNombre = false);
    }
  }

  Future<void> _cambiarPassword() async {
    if (!_formPasswordKey.currentState!.validate()) return;
    setState(() => _cambiandoPassword = true);

    try {
      await ref.read(perfilRepositoryProvider).cambiarPassword(
            _passwordActualController.text,
            _passwordNuevaController.text,
          );
      if (mounted) {
        _passwordActualController.clear();
        _passwordNuevaController.clear();
        _passwordConfirmController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Contraseña cambiada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _cambiandoPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Editar perfil'),
        backgroundColor: _colorPrimario,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sección información personal
            Text(
              'Información personal',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _colorPrimario,
                  ),
            ),
            const SizedBox(height: 16),
            Form(
              key: _formNombreKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nombreController,
                    textCapitalization: TextCapitalization.words,
                    decoration: InputDecoration(
                      labelText: 'Nombre completo',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: _colorPrimario, width: 2),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'El nombre no puede estar vacío';
                      }
                      if (v.trim().length < 3) {
                        return 'El nombre debe tener al menos 3 caracteres';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: _colorPrimario,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _guardandoNombre ? null : _guardarNombre,
                      child: _guardandoNombre
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Guardar nombre'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 24),
            // Sección cambiar contraseña
            Text(
              'Cambiar contraseña',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _colorPrimario,
                  ),
            ),
            const SizedBox(height: 16),
            Form(
              key: _formPasswordKey,
              child: Column(
                children: [
                  // Contraseña actual
                  TextFormField(
                    controller: _passwordActualController,
                    obscureText: !_verPasswordActual,
                    decoration: InputDecoration(
                      labelText: 'Contraseña actual',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _verPasswordActual
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () => setState(
                          () => _verPasswordActual = !_verPasswordActual,
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: _colorPrimario, width: 2),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        return 'Introduce tu contraseña actual';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  // Nueva contraseña
                  TextFormField(
                    controller: _passwordNuevaController,
                    obscureText: !_verPasswordNueva,
                    decoration: InputDecoration(
                      labelText: 'Nueva contraseña',
                      prefixIcon: const Icon(Icons.lock_reset_outlined),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _verPasswordNueva
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () => setState(
                          () => _verPasswordNueva = !_verPasswordNueva,
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: _colorPrimario, width: 2),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        return 'Introduce la nueva contraseña';
                      }
                      if (v.length < 8) {
                        return 'La contraseña debe tener al menos 8 caracteres';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  // Confirmar contraseña
                  TextFormField(
                    controller: _passwordConfirmController,
                    obscureText: !_verPasswordConfirm,
                    decoration: InputDecoration(
                      labelText: 'Confirmar nueva contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _verPasswordConfirm
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () => setState(
                          () => _verPasswordConfirm = !_verPasswordConfirm,
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: _colorPrimario, width: 2),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        return 'Confirma la nueva contraseña';
                      }
                      if (v != _passwordNuevaController.text) {
                        return 'Las contraseñas no coinciden';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: _colorPrimario,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _cambiandoPassword ? null : _cambiarPassword,
                      child: _cambiandoPassword
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Cambiar contraseña'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
