"use client"

import { AnimatePresence, motion, type Transition } from "framer-motion"
import { usePathname } from "next/navigation"

// Variantes de animación: fade + slide-up suave, solo opacity y transform (GPU-accelerated)
const variantes = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

const transicion: Transition = { duration: 0.22, ease: "easeOut" }

interface TransicionPaginaProps {
  children: React.ReactNode
}

// Envuelve el contenido de cada página con una animación de entrada/salida.
// usePathname() se usa como key para que AnimatePresence detecte el cambio de ruta
// y ejecute la animación de salida antes de montar la nueva página.
export function TransicionPagina({ children }: TransicionPaginaProps) {
  const ruta = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ruta}
        variants={variantes}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transicion}
        // willChange fuerza aceleración GPU para que la animación sea fluida en móvil
        style={{ willChange: "transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
