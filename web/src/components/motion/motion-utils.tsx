'use client';

import { useReducedMotion } from 'motion/react';
import { type HTMLMotionProps, motion } from 'motion/react';
import * as React from 'react';

export const transitions = {
  fast: 0.16,
  normal: 0.24,
  slow: 0.42,
};

export const easing = [0.22, 1, 0.36, 1] as const;

export function useMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    duration: prefersReducedMotion ? 0 : transitions.normal,
  };
}

export function FadeIn({ children, ...props }: HTMLMotionProps<'div'>) {
  const { prefersReducedMotion } = useMotionConfig();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : transitions.normal, ease: easing }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, ...props }: HTMLMotionProps<'div'>) {
  const { prefersReducedMotion } = useMotionConfig();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : transitions.normal, ease: easing }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, ...props }: HTMLMotionProps<'div'>) {
  const { prefersReducedMotion } = useMotionConfig();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : transitions.fast, ease: easing }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }} {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'>) {
  const { prefersReducedMotion } = useMotionConfig();

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: prefersReducedMotion ? 0 : transitions.normal, ease: easing }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Pressable({ children, ...props }: HTMLMotionProps<'button'>) {
  const { prefersReducedMotion } = useMotionConfig();

  return (
    <motion.button
      whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
      transition={{ duration: prefersReducedMotion ? 0 : transitions.fast, ease: easing }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function AnimatedPresence({ children, ...props }: React.ComponentProps<typeof motion.div>) {
  return <motion.div {...props}>{children}</motion.div>;
}
