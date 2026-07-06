import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../repositories/auth_repository.dart';

class RecuperarPasswordScreen extends ConsumerStatefulWidget {
  const RecuperarPasswordScreen({super.key});

  @override
  ConsumerState<RecuperarPasswordScreen> createState() =>
      _RecuperarPasswordScreenState();
}

class _RecuperarPasswordScreenState
    extends ConsumerState<RecuperarPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _enviando = false;
  bool _enviado = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviarEnlace() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _enviando = true);
    try {
      // Siempre mostramos éxito independientemente del resultado
      await AuthRepository().recuperarPassword(_emailCtrl.text.trim());
    } catch (_) {
      // Ignoramos el error intencionadamente
    } finally {
      if (mounted) {
        setState(() {
          _enviando = false;
          _enviado = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recuperar contraseña'),
        centerTitle: true,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: _enviado
              ? _PantallaExito(
                  email: _emailCtrl.text.trim(),
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                  onVolver: () => Navigator.of(context).pop(),
                )
              : _FormularioRecuperar(
                  formKey: _formKey,
                  emailCtrl: _emailCtrl,
                  enviando: _enviando,
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                  onEnviar: _enviarEnlace,
                ),
        ),
      ),
    );
  }
}

class _FormularioRecuperar extends StatelessWidget {
  const _FormularioRecuperar({
    required this.formKey,
    required this.emailCtrl,
    required this.enviando,
    required this.colorScheme,
    required this.textTheme,
    required this.onEnviar,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final bool enviando;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final VoidCallback onEnviar;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.lock_reset_outlined,
                size: 44,
                color: colorScheme.secondary,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            '¿Olvidaste tu contraseña?',
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña. Si no lo ves, revisa la carpeta de spam.',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: emailCtrl,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => onEnviar(),
            decoration: const InputDecoration(
              labelText: 'Correo electrónico',
              hintText: 'tu@email.com',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return 'El correo es obligatorio';
              }
              if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v.trim())) {
                return 'Introduce un correo válido';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: enviando ? null : onEnviar,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: enviando
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : const Text(
                    'Enviar enlace',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _PantallaExito extends StatelessWidget {
  const _PantallaExito({
    required this.email,
    required this.colorScheme,
    required this.textTheme,
    required this.onVolver,
  });

  final String email;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final VoidCallback onVolver;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 32),
        Center(
          child: Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Icon(
              Icons.mark_email_read_outlined,
              size: 52,
              color: Colors.green.shade700,
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Revisa tu correo',
          style: textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          'Si existe una cuenta asociada a $email, recibirás un enlace para restablecer tu contraseña en los próximos minutos.',
          style: textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Recuerda revisar la carpeta de spam.',
          style: textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        OutlinedButton(
          onPressed: onVolver,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: const Text(
            'Volver al inicio de sesión',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
