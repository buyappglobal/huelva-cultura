export type FluidPreset = 'nebula' | 'ocean' | 'liquid' | 'static' | 'cosmic' | 'magma' | 'cyberpunk' | 'forest' | 'sunset';

export interface FluidAnimationParams {
  colors: string[];
  speed: number;
}

export const fluidPresets: Record<FluidPreset, FluidAnimationParams> = {
  nebula: {
    colors: ['#4b0082', '#8a2be2', '#00ced1', '#4b0082'],
    speed: 0.002,
  },
  ocean: {
    colors: ['#001f3f', '#0074D9', '#7FDBFF', '#001f3f'],
    speed: 0.001,
  },
  liquid: {
    colors: ['#ff4136', '#ff851b', '#ffdc00', '#ff4136'],
    speed: 0.003,
  },
  cosmic: {
    colors: ['#0d0b26', '#2b1b54', '#5f2b80', '#0a8080', '#0d0b26'],
    speed: 0.0015,
  },
  magma: {
    colors: ['#140202', '#4a0808', '#991b1b', '#ea580c', '#140202'],
    speed: 0.002,
  },
  cyberpunk: {
    colors: ['#1e0b36', '#db2777', '#7c3aed', '#2563eb', '#1e0b36'],
    speed: 0.0025,
  },
  forest: {
    colors: ['#021c15', '#065f46', '#059669', '#34d399', '#021c15'],
    speed: 0.0012,
  },
  sunset: {
    colors: ['#2e081c', '#701a75', '#d946ef', '#f97316', '#e11d48', '#2e081c'],
    speed: 0.0018,
  },
  static: {
    colors: ['#1a1a1a', '#1a1a1a'],
    speed: 0,
  },
};
