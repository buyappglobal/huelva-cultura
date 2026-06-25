/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeometryType, SimConfig } from '../types';

export function getDynamicEquation(geometry: GeometryType, config: SimConfig): string {
  const v = config.speed; // velocity coef
  const f = config.force; // force coef
  const s = config.scale; // scale coef

  switch (geometry) {
    case 'esfera_particulas': {
      const k = (0.035 * f).toFixed(4);
      return `F_elastic = -${k} * (x - x_target) + F_mouse, F_friction = v * 0.88`;
    }
    case 'lorenz_attractor': {
      const rho = (28 * f).toFixed(2);
      const dt = (0.0035 * v).toFixed(4);
      return `dt = ${dt}, dx/dt = 10(y - x), dy/dt = x(${rho} - z) - y, dz/dt = xy - 2.67z`;
    }
    case 'toroide_nodo': {
      const step = (0.0055 * v).toFixed(4);
      const radMult = (75 * f).toFixed(1);
      const zMult = (90 * f).toFixed(1);
      return `θ_step = ${step}, r = cos(3θ) + 2, x = r * cos(7θ) * ${radMult}, y = r * sin(7θ) * ${radMult}, z = sin(3θ) * ${zMult}`;
    }
    case 'red_pliegues': {
      const step = (0.012 * v).toFixed(4);
      const fMouse = (60 * f).toFixed(1);
      return `speed = ${step}, F_mouse = ${fMouse}, z = sin(col * 0.18 + speed * t) * cos(row * 0.18 + speed * t) * 35`;
    }
    case 'rossler_attractor': {
      const dt = (0.015 * v).toFixed(4);
      const c = (5.7 * f).toFixed(2);
      return `dt = ${dt}, dx/dt = -y - z, dy/dt = x + 0.2y, dz/dt = 0.2 + z(x - ${c})`;
    }
    case 'espiral_aurea': {
      const step = (0.15 * 0.012 * v).toFixed(4);
      const expand = (0.2 * f).toFixed(2);
      return `θ_step_t = ${step}, expand = 1.0 + sin(0.5 * t) * ${expand}, r = sqrt(n) * 11 * expand, x = r * cos(θ), y = r * sin(θ)`;
    }
    case 'campo_flujo': {
      const ang = (4 * f).toFixed(2);
      const vel = (3.5 * v).toFixed(2);
      return `angle = Noise(0.0035x, 0.0035y) * ${ang} * π, vx = cos(angle) * ${vel}, vy = sin(angle) * ${vel}`;
    }
    case 'clifford_attractor': {
      const a = (-1.4 * v).toFixed(2);
      const b = (1.6 * f).toFixed(2);
      const d = (0.7 * s).toFixed(2);
      return `a = ${a}, b = ${b}, d = ${d}, x_new = sin(a * y) + cos(a * x), y_new = sin(b * x) + ${d} * cos(b * y)`;
    }
    case 'cintas_seda': {
      const amp = (60 * f).toFixed(1);
      return `phase = p * 0.05 - 3 * t, A = ${amp}, y = y_c + sin(phase) * A * cos(z_offset)`;
    }
    case 'cubo_hiper_rejilla': {
      const br = (0.25 * f).toFixed(2);
      return `breathing = 1.0 + sin(2t + d_c * 0.015) * ${br}, X_rot = R_y * R_x * (X * breathing)`;
    }
    case 'anillos_turbulencia': {
      const nMax = (32 * f).toFixed(1);
      return `noiseOffset = Noise(cos(θ)*0.4, sin(θ)*0.4 + t) * ${nMax}, r = baseRad + noiseOffset, x = r * cos(θ), y = r * sin(θ)`;
    }
    case 'delaunay_constelacion': {
      const dMax = (85 * s).toFixed(1);
      const pull = (2.0 * f).toFixed(1);
      const speed = v.toFixed(2);
      return `d(p1, p2) < ${dMax} => Conectar(), v = speed * ${speed}, F_mouse_pull = ${pull}`;
    }
    case 'vortice_helicoidal': {
      const step = (0.015 * v).toFixed(4);
      const str = (0.25 * f).toFixed(2);
      return `θ_step = ${step}, stretch = 1.0 + cos(0.8 * t) * ${str}, r = (65 + sin(0.25 * θ) * 20) * stretch, x = r * cos(θ), z = r * sin(θ)`;
    }
    case 'aizawa_attractor': {
      const dt = (0.005 * v).toFixed(4);
      const b = (0.7 * f).toFixed(2);
      return `dt = ${dt}, b = ${b}, dx/dt = (z - ${b})x - 3.5y, dy/dt = 3.5x + (z - ${b})y, dz/dt = 0.65 + 0.95z - z³/3 - (x²+y²)(1 + 0.25z) + 0.1zx³`;
    }
    case 'oleos_abstractos': {
      const drift = (0.45 * f).toFixed(2);
      const speed = v.toFixed(2);
      return `F_brownian = Ran(-0.5, 0.5) * ${drift}, speed = ${speed}, dx/dt = vx * speed, dy/dt = vy * speed`;
    }
    case 'cinta_mobius': {
      const rot = (0.05 * v).toFixed(2);
      return `v = t * ${rot}, x = (1 + s/2 * cos(v/2)) * cos(v), y = (1 + s/2 * cos(v/2)) * sin(v), z = s/2 * sin(v/2)`;
    }
    case 'atractor_lorenz_83': {
      const dt = (0.012 * v).toFixed(4);
      const f_env = (7.0 * f).toFixed(1);
      return `dt = ${dt}, F = ${f_env}, dx/dt = -ax - y² - z² + af, dy/dt = -y + xy - bxz + g, dz/dt = -z + bxy + xz`;
    }
    case 'mapa_henon': {
      const a = (1.4 * f).toFixed(2);
      const b = (0.3 * s).toFixed(2);
      return `discrete_step, x_next = 1 - ${a}x² + y, y_next = ${b}x`;
    }
    case 'hiper_toro': {
      const scale = (60 * s).toFixed(1);
      return `4D_Proj, (R + r cos θ) cos φ, (R + r cos θ) sin φ, r sin θ cos ψ, r sin θ sin ψ * ${scale}`;
    }
    case 'fluido_organico': {
      const freq = (0.012 * v).toFixed(4);
      const amp = (75 * f).toFixed(1);
      return `y = height*b + (sin(x * 0.002 + t * 1.4 * speed) * ${amp} + A_audio) * scale`;
    }
    default:
      return '';
  }
}
