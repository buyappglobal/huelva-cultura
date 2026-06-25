/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GeometryType =
  | 'esfera_particulas'
  | 'lorenz_attractor'
  | 'toroide_nodo'
  | 'red_pliegues'
  | 'rossler_attractor'
  | 'espiral_aurea'
  | 'campo_flujo'
  | 'clifford_attractor'
  | 'cintas_seda'
  | 'cubo_hiper_rejilla'
  | 'anillos_turbulencia'
  | 'delaunay_constelacion'
  | 'vortice_helicoidal'
  | 'aizawa_attractor'
  | 'oleos_abstractos'
  | 'cinta_mobius'
  | 'atractor_lorenz_83'
  | 'mapa_henon'
  | 'hiper_toro'
  | 'human_kinetic'
  | 'vase'
  | 'headphones'
  | 'classic_car'
  | 'arrecife_coral'
  | 'red_micelio'
  | 'campo_pulsante'
  | 'constelacion_profunda'
  | 'medusa_bio'
  | 'flock_murmuration'
  | 'vortice_abisal'
  | 'nebula_primordial'
  | 'forest_heart'
  | 'solar_flare'
  | 'ice_crystals'
  | 'neural_network'
  | 'firefly_swarm'
  | 'sand_dunes'
  | 'lava_flow'
  | 'stellar_wind'
  | 'fluido_organico'
  | 'vidriera_roseton'
  | 'artefacto_matematico';

export type TextureMode = 'neon' | 'glass' | 'mercury' | 'nebula' | 'ghost';
export type RenderMode = 'puntillismo' | 'oleo' | 'acuarela' | 'vectorial';

export interface Particle {
  x: number;
  y: number;
  z: number;
  px: number; // Previous X for trailing lines
  py: number; // Previous Y
  vx: number;
  vy: number;
  vz: number;
  ox: number; // Original/target X
  oy: number; // Original/target Y
  oz: number; // Original/target Z
  color: string;
  size: number;
  alpha: number;
  age: number;
  life: number;
  extra?: any; // Additional custom properties
}

export type AudioBand = 'subBass' | 'bass' | 'lowMid' | 'mid' | 'highMid' | 'treble';

export interface ExternalModulation {
  scale?: number;
  force?: number;
  speed?: number;
  trailOpacity?: number;
  bloomIntensity?: number;
  layerScale?: Record<string, number>;
  layerOpacity?: Record<string, number>;
  layerColor?: Record<string, string>;
  particleSizeScale?: number;
  vjPanicStrobe?: boolean;
  vjKaleidoscope?: boolean;
  vjAcidDrift?: boolean;
  vjSignalNoise?: boolean;
  vjHyperFlow?: boolean;
  vjQuantumMirror?: boolean;
  vjChromaGlitch?: boolean;
  vjInfinityTrails?: boolean;
  vjFractalShift?: boolean;
}

export interface MidiMapping {
  cc: number;
  target: 'scale' | 'force' | 'speed' | 'trail' | 'bloom' | 'layerScale' | 'layerOpacity' | 'layerColor' | 'particleSizeScale' |
          'vjPanicStrobe' | 'vjKaleidoscope' | 'vjAcidDrift' | 'vjSignalNoise' | 'vjHyperFlow' | 'vjQuantumMirror' | 'vjChromaGlitch' | 'vjInfinityTrails' | 'vjFractalShift' |
          'vjCrtEffect' | 'vjVhsEffect' | 'vjChromaticEffect';
  layerId?: string;
  min?: number;
  max?: number;
}

export interface OscMapping {
  address: string;
  target: 'scale' | 'force' | 'speed' | 'trail' | 'bloom' | 'layerScale' | 'layerOpacity' | 'layerColor' | 'particleSizeScale' |
          'vjPanicStrobe' | 'vjKaleidoscope' | 'vjAcidDrift' | 'vjSignalNoise' | 'vjHyperFlow' | 'vjQuantumMirror' | 'vjChromaGlitch' | 'vjInfinityTrails' | 'vjFractalShift' |
          'vjCrtEffect' | 'vjVhsEffect' | 'vjChromaticEffect';
  layerId?: string;
  min?: number;
  max?: number;
}

export interface ProIntegrationConfig {
  midiEnabled: boolean;
  oscEnabled: boolean;
  oscHost: string;
  oscPort: number;
  midiMappings: MidiMapping[];
  oscMappings: OscMapping[];
}

export interface VisualLayer {
  id: string;
  geometry: GeometryType;
  audioBand: AudioBand;
  instrumentLabel?: string; // e.g. "Voz", "Batería", "Sinte"
  scale: number;
  offsetX: number; // -1000 to 1000
  offsetY: number; // -1000 to 1000
  color: string;   // Hex or color name
  opacity: number;
  visible: boolean;
  solo?: boolean; // Soloing mode active (muting all other non-soloed tracks)
  audioSensitivity?: number; // 0 to 2
}

export interface UserPreset {
  id: string;
  name: string;
  timestamp: number;
  config: Partial<SimConfig>;
}

export interface BackgroundSlide {
  id: string;
  time: number; // in seconds when it triggers in the song
  imageUrl: string;
  caption?: string; // lyrics or subtitle text for storytelling
  imagePrompt?: string; // Prompt for AI image generation
  // Effect modifiers applied when this slide is triggered
  geometry?: GeometryType;
  scale?: number;
  speed?: number;
  force?: number;
  colorTheme?: string;
  trailOpacity?: number;
  bloomIntensity?: number;
  particleSizeScale?: number;
}

export type AppMode = 'studio' | 'performance';

export interface SimConfig {
  appMode?: AppMode;
  geometry: GeometryType;
  speed: number;        // Sliders controlling: Velocidad/Frecuencia
  force: number;        // Slider controlling: Multiplicador de Fuerza (Grav/Caos)
  scale: number;        // Slider controlling: Escala Global
  trailOpacity: number; // Slider controlling: Opacidad de Estela
  bloomIntensity: number; // Slider controlling: Post-processing glow
  denoiser?: number;    // Slider controlling: Post-processed edge smoothing (0-5)
  isPaused: boolean;
  recordingDuration: number; // 0 for manual, -1 for full audio, or seconds
  colorTheme: string;   // Spectral, Cyberpunk, Toxic Green, Aurora, Volcanic, Monochromatic
  textureMode: TextureMode;
  renderMode: RenderMode;
  interactiveMode: 'attract' | 'repel' | 'vortex' | 'none';
  showDebug: boolean;
  aspectRatio?: 'libre' | '16_9' | '9_16' | '4_5';
  autoMovement?: boolean;
  circadianMode?: 'off' | 'auto' | 'amanecer' | 'mediodia' | 'atardecer' | 'noche';
  isMultiLayer?: boolean;
  focusMode?: boolean;
  loopAudio?: boolean;
  freezeAudio?: boolean;
  multiplicity?: number; // 1 to 4
  userZoom?: number;     // for wheel zoom
  layers?: VisualLayer[];
  proIntegration?: ProIntegrationConfig;
  externalModulation?: ExternalModulation;
  bloom?: boolean;
  opacity?: number;
  audioBand?: AudioBand;
  
  // Background images / Storytelling modes
  backgroundImageUrl?: string; // single image URL
  backgroundVideoUrl?: string; // single video URL or loop path
  backgroundOpacity?: number;  // 0 to 1
  backgroundBlur?: number;     // blur in pixels
  activeBackgroundMode?: 'color' | 'image' | 'video' | 'slideshow';
  backgroundSlides?: BackgroundSlide[];
  currentSlideId?: string;
  hideStoryCaption?: boolean;
  particleSizeScale?: number;
  isAIChoreographyEffectsActive?: boolean;
  audioMixer?: AudioMixerConfig;
  isMp3ToMidiConverterActive?: boolean;
  mp3ToMidiThreshold?: number;
  performanceMode?: boolean;
  mp3ToMidiAlgorithm?: 'autocorrelation' | 'spectral_peaks' | 'transient_triggers';
  vjPanicStrobe?: boolean;
  vjKaleidoscope?: boolean;
  vjAcidDrift?: boolean;
  vjSignalNoise?: boolean;
  vjHyperFlow?: boolean;
  vjQuantumMirror?: boolean;
  vjChromaGlitch?: boolean;
  vjInfinityTrails?: boolean;
  vjFractalShift?: boolean;
  vjCrtEffect?: boolean;
  vjVhsEffect?: boolean;
  vjChromaticEffect?: boolean;
  selectedArtifactId?: string;
  customFormulaX?: string;
  customFormulaY?: string;
  customFormulaZ?: string;
  customFormulaColor?: string;
  customFormulaCount?: number;
  customText?: string;
  customTextEffect?: 'bounce' | 'rotate' | 'float' | 'melt' | 'fire' | 'pulse' | 'wave' | 'none';
  customTextEffects?: string[];
  customTextSpeed?: number;
  customTextFont?: string;
  customTextVisible?: boolean;
  customTextSize?: number;
  backgroundPreset?: string;
  uiTheme?: 'studio_dark' | 'studio_light' | 'concert_mode';
  isMultiChannelInputActive?: boolean;
  channelMappings?: {
    bateria: number;
    teclados: number;
    bajo: number;
    solista: number;
    guitarra: number;
  };
  transitionDuration?: number;
  isAutoAestheticRecommendationActive?: boolean;
  vjBeatStrobeActive?: boolean;
  vjBeatGlitchActive?: boolean;
  audioEffects?: {
    reverbWet: number;
    delayWet: number;
    delayTime: number;
    delayFeedback: number;
    distortionDrive: number;
    voiceFilterFreq: number;
    voiceFilterType: 'none' | 'lowpass' | 'highpass';
  };
}

export interface AudioMixerConfig {
  eqBass: number;       // dB values (-12 to +12)
  eqMid: number;        // dB values (-12 to +12)
  eqTreble: number;     // dB values (-12 to +12)
  synthKick: number;    // Multiplier (0.0 to 2.0)
  synthPad: number;     // Multiplier (0.0 to 2.0)
  synthHat: number;     // Multiplier (0.0 to 2.0)
}

export interface GeometryMeta {
  id: GeometryType;
  name: string;
  equation: string;
  description: string;
  historicalContext: string;
  tips: string;
  category: 'Caos' | 'Topología' | 'Natural' | 'Matemática' | 'Cotidiano' | 'Orgánico';
}

export const GEOMETRY_METADATA: Record<GeometryType, GeometryMeta> = {
  esfera_particulas: {
    id: 'esfera_particulas',
    name: 'Esfera Elástica',
    equation: 'F_elastic = -k * (x - x_target) + F_mouse',
    description: 'Matriz elástica de círculos reactivos proyectados sobre un plano 3D.',
    historicalContext: 'Mapeo procedural y modelado elástico de mallas moleculares.',
    tips: 'Mueve el ratón para deformar radialmente la esfera elástica.',
    category: 'Topología'
  },
  lorenz_attractor: {
    id: 'lorenz_attractor',
    name: 'Atractor de Lorenz',
    equation: 'dx/dt = σ(y - x), dy/dt = x(ρ - z) - y, dz/dt = xy - βz',
    description: 'Sistema de ecuaciones diferenciales que modela la convección atmosférica.',
    historicalContext: 'Descubierto en 1963 por Edward Lorenz. Reveló el Efecto Mariposa.',
    tips: 'Aumenta la Fuerza para expandir los límites caóticos.',
    category: 'Caos'
  },
  toroide_nodo: {
    id: 'toroide_nodo',
    name: 'Nudo Toroidal',
    equation: 'r = cos(qθ) + 2, x = r cos(pθ), y = r sin(pθ), z = sin(qθ)',
    description: 'Anillo nudo retorcido tridimensional con trayectorias periódicas.',
    historicalContext: 'Derivado del estudio de la teoría de nudos topológicos.',
    tips: 'La Escala modifica el radio de flexión tridimensional del nudo.',
    category: 'Topología'
  },
  red_pliegues: {
    id: 'red_pliegues',
    name: 'Red de Pliegues',
    equation: 'z = sin(col * u + t) * cos(row * v + t)',
    description: 'Malla tridimensional deformada por ondas senoidales dinámicas.',
    historicalContext: 'Métodos de oscilaciones armónicas en membranas acústicas.',
    tips: 'Haz clic para enviar ondas de choque a través de la red.',
    category: 'Matemática'
  },
  rossler_attractor: {
    id: 'rossler_attractor',
    name: 'Atractor de Rössler',
    equation: 'dx/dt = -y - z, dy/dt = x + ay, dz/dt = b + z(x - c)',
    description: 'Atractor caótico diseñado para tener un solo bucle helicoidal.',
    historicalContext: 'Propuesto en 1976 por Otto Rössler.',
    tips: 'La Velocidad acelera el plegado orbital externo del flujo.',
    category: 'Caos'
  },
  espiral_aurea: {
    id: 'espiral_aurea',
    name: 'Espiral Áurea',
    equation: 'r = a * e^(bθ), θ = n * 137.5°',
    description: 'Estructura geométrica basada en la proporción áurea de Fibonacci.',
    historicalContext: 'La espiral áurea es un patrón omnipresente en la naturaleza.',
    tips: 'Usa Opacidad baja para ver líneas vectoriales finas.',
    category: 'Natural'
  },
  campo_flujo: {
    id: 'campo_flujo',
    name: 'Campo de Flujo',
    equation: 'α = Angle(Noise(x, y) * 2π)',
    description: 'Simula un líquido abstracto donde cada partícula fluye con ruido vectorial.',
    historicalContext: 'Creado por Ken Perlin en 1983 para efectos especiales.',
    tips: 'Crea un vórtice con el puntero del ratón.',
    category: 'Natural'
  },
  clifford_attractor: {
    id: 'clifford_attractor',
    name: 'Atractor de Clifford',
    equation: 'x_new = sin(ay) + c cos(ax), y_new = sin(bx) + d cos(by)',
    description: 'Atracción orbital discontinua que genera un entrelazado de alta densidad.',
    historicalContext: 'Creado por Clifford Pickover en sus estudios sobre fractales.',
    tips: 'Cambiar la Fuerza genera mutaciones fractales extremas.',
    category: 'Caos'
  },
  cintas_seda: {
    id: 'cintas_seda',
    name: 'Cintas de Seda',
    equation: 'y = y_c + sin(x * f + φ + t) * A * cos(z_offset)',
    description: 'Ondas sinusoidales superpuestas simulando seda en gravedad cero.',
    historicalContext: 'Mecanismo clásico de simulación de osciloscopios analógicos.',
    tips: 'Perfecto con Trail Opacity en 0.05.',
    category: 'Natural'
  },
  cubo_hiper_rejilla: {
    id: 'cubo_hiper_rejilla',
    name: 'Hiper-Rejilla 3D',
    equation: 'X_rot = R_y * R_x * (X + sin(dist_centro + t) * d)',
    description: 'Estructura ortogonal que se expande y deforma rotando sincronizadamente.',
    historicalContext: 'Geometrías cuatridimensionales proyectadas en el espacio cartesiano.',
    tips: 'Mueve el ratón para rotar el hipercubo.',
    category: 'Topología'
  },
  anillos_turbulencia: {
    id: 'anillos_turbulencia',
    name: 'Anillos Magnéticos',
    equation: 'R(θ) = R_0 + RadialNoise(θ) * Fuerza * sin(t)',
    description: 'Anillos concéntricos resonantes perturbados por ruido radial.',
    historicalContext: 'Sistemas resonantes circulares y turbulencias en fluidos.',
    tips: 'La velocidad cambia la frecuencia de vibración del plasma.',
    category: 'Matemática'
  },
  delaunay_constelacion: {
    id: 'delaunay_constelacion',
    name: 'Constelación Delaunay',
    equation: 'd(p1, p2) < R => Conectar(p1, p2)',
    description: 'Nodos flotantes libres que generan mallas triangulares sutiles.',
    historicalContext: 'Formulación del matemático Boris Delaunay en 1934.',
    tips: 'Usa el mouse para atraer los nodos y colapsar la formación.',
    category: 'Matemática'
  },
  vortice_helicoidal: {
    id: 'vortice_helicoidal',
    name: 'Vórtice Helicoidal',
    equation: 'x = r cos(θ + t), z = r sin(θ + t), y = y_base + sin(t)',
    description: 'Estructuras helicoidales entrelazadas inspiradas en el ADN.',
    historicalContext: 'Modelado estructural de macromoléculas de polímeros.',
    tips: 'Ajusta la velocidad para cambiar el paso helicoidal.',
    category: 'Natural'
  },
  aizawa_attractor: {
    id: 'aizawa_attractor',
    name: 'Atractor de Aizawa',
    equation: 'Spherical funnel ODE system',
    description: 'Atractor esférico caótico que fluye en órbita helicoidal concéntrica.',
    historicalContext: 'Derivado matemático reciente de estudios en control geométrico.',
    tips: 'Baja la velocidad al mínimo para ver la costura orbital.',
    category: 'Caos'
  },
  oleos_abstractos: {
    id: 'oleos_abstractos',
    name: 'Pinceladas de Óleo',
    equation: 'F_fluid = NavierStokes + BlurCircular()',
    description: 'Cremas cromáticas fluidas que crean nubes líquidas orgánicas.',
    historicalContext: 'Inspirado en Jackson Pollock y dinámica de fluidos.',
    tips: 'Aumenta la Estela para dejar pinceladas permanentes.',
    category: 'Natural'
  },
  cinta_mobius: {
    id: 'cinta_mobius',
    name: 'Cinta de Möbius',
    equation: 'x = r cos(v), y = r sin(v), z = s * sin(v/2)',
    description: 'Superficie con una sola cara y un solo borde, un icono de la topología.',
    historicalContext: 'Descubierta independientemente por August Möbius y Johann Listing en 1858.',
    tips: 'Observa cómo las partículas completan una vuelta regresando invertidas.',
    category: 'Topología'
  },
  atractor_lorenz_83: {
    id: 'atractor_lorenz_83',
    name: 'Lorenz 83 (Model Climático)',
    equation: 'dx/dt = -ax - y² - z² + af, dy/dt = -y + xy - bxz + g...',
    description: 'Un modelo simplificado de la circulación atmosférica a gran escala.',
    historicalContext: 'Modelado por Edward Lorenz en 1983 para estudiar la variabilidad interanual.',
    tips: 'Modifica la fuerza para ver cómo se estructuran los puentes de circulación.',
    category: 'Caos'
  },
  mapa_henon: {
    id: 'mapa_henon',
    name: 'Mapa de Hénon Discreto',
    equation: 'x_n+1 = 1 - ax² + y, y_n+1 = bx',
    description: 'Mapa dinámico discreto en el tiempo que exhibe comportamiento caótico fractal.',
    historicalContext: 'Introducido por Michel Hénon como una simplificación del sistema de Lorenz.',
    tips: 'El rastro es vital aquí para ver la estructura de la "herradura" fractal.',
    category: 'Caos'
  },
  hiper_toro: {
    id: 'hiper_toro',
    name: 'Hiper-Toroide 4D',
    equation: 'Proyección 4D de (R + r cos θ) cos φ...',
    description: 'La proyección tridimensional de un toroide en la cuarta dimensión espacial.',
    historicalContext: 'Exploración de variedades de dimensiones superiores en física teórica.',
    tips: 'Usa la escala para navegar a través de las capas internas del hiper-objeto.',
    category: 'Topología'
  },
  human_kinetic: {
    id: 'human_kinetic',
    name: 'Cinetismo Humano',
    equation: 'Bio-Harmonic Motion Cycle (GAIT)',
    description: 'Simulación de una silueta humana caminando basada en ciclos de oscilación armónica.',
    historicalContext: 'Estudios de cronofotografía de Muybridge y cinemática inversa digital.',
    tips: 'Sube el Multiplicador de Caos para ver la estructura bio-digital desintegrarse.',
    category: 'Orgánico'
  },
  vase: {
    id: 'vase',
    name: 'Ánfora Minimalista',
    equation: 'Revolution Surface: r = a + b*sin(nz)',
    description: 'Un jarrón clásico generado mediante una superficie de revolución armónica.',
    historicalContext: 'Inspirado en la cerámica griega y las proporciones áureas de diseño industrial.',
    tips: 'Aumenta la Velocidad para ver el flujo cerámico en movimiento.',
    category: 'Orgánico'
  },
  headphones: {
    id: 'headphones',
    name: 'Velo de Auriculares',
    equation: 'Twin Toroidal Segments & Arc',
    description: 'Estructura ergonómica simplificada que representa la silueta de unos cascos.',
    historicalContext: 'Abstracción de objetos tecnológicos cotidianos mediante geometría pura.',
    tips: 'Rota el objeto lateralmente para apreciar el arco de conexión.',
    category: 'Orgánico'
  },
  classic_car: {
    id: 'classic_car',
    name: 'Prototipo Cinético',
    equation: 'Multi-Bounding Box Approximation',
    description: 'Silueta minimalista de un vehículo basada en estructuras de puntos vectoriales.',
    historicalContext: 'Representación del movimiento mecánico y la estética Streamline Moderne.',
    tips: 'Usa el Caos para transformar el coche en una nube de partículas aerodinámica.',
    category: 'Orgánico'
  },
  arrecife_coral: {
    id: 'arrecife_coral',
    name: 'Arrecife Coralino',
    equation: 'Growth = Σ(Harmonics * BassEnergy)',
    description: 'Estructura ramificada que crece y se expande siguiendo el ritmo de los graves.',
    historicalContext: 'Inspirado en sistemas de L-Systems y crecimiento biológico colonial.',
    tips: 'Aumenta la escala para sumergirte en el bosque de coral.',
    category: 'Natural'
  },
  red_micelio: {
    id: 'red_micelio',
    name: 'Red Micelio',
    equation: 'Network = Perlin3D(x,y,z) * MidEnergy',
    description: 'Filamentos profundos que conectan nodos invisibles, reaccionando a las frecuencias medias.',
    historicalContext: 'Basado en las redes de comunicación fúngica en ecosistemas boscosos.',
    tips: 'Usa renderizado de Óleo para ver las conexiones más densas.',
    category: 'Orgánico'
  },
  campo_pulsante: {
    id: 'campo_pulsante',
    name: 'Campo Pulsante',
    equation: 'z = sin(r - t) / (1 + r²)',
    description: 'Una membrana topológica que pulsa radialmente según la energía total del audio.',
    historicalContext: 'Simulación de superficies de ondas en fluidos viscosos.',
    tips: 'Desactiva el modo de interacción para ver la pulsación pura.',
    category: 'Matemática'
  },
  constelacion_profunda: {
    id: 'constelacion_profunda',
    name: 'Constelación Profunda',
    equation: 'Z-Depth Shimmer: Star(high) + Planet(low/mid)',
    description: 'Bóveda estelar donde planetas y estrellas reaccionan según su profundidad y naturaleza.',
    historicalContext: 'Mapeo estelar interactivo basado en paralaje y respuesta espectral.',
    tips: 'Las estrellas reaccionan al brillo agudo, los planetas a la masa del bajo.',
    category: 'Natural'
  },
  medusa_bio: {
    id: 'medusa_bio',
    name: 'Medusa Bioluminiscente',
    equation: 'R(t) = A(1 + sin(wt))',
    description: 'Pulsaciones rítmicas inspiradas en criaturas abisales.',
    historicalContext: 'Estudio de cinemática de fluidos aplicada a seres vivos.',
    tips: 'Reacciona al bombo con expansión masiva.',
    category: 'Orgánico'
  },
  flock_murmuration: {
    id: 'flock_murmuration',
    name: 'Murmullo de Estorninos',
    equation: 'V = Alignment + Cohesion + Separation',
    description: 'Comportamiento de enjambre sincronizado al espectro sonoro.',
    historicalContext: 'Algoritmos Boids de Craig Reynolds aplicados al audio.',
    tips: 'El brillo agudo separa el enjambre, el bajo lo cohesiona.',
    category: 'Orgánico'
  },
  vortice_abisal: {
    id: 'vortice_abisal',
    name: 'Vórtice Abisal',
    equation: 'F = m(v^2 / r)',
    description: 'Torbellino de luz que succiona la energía del entorno.',
    historicalContext: 'Simulación de remolinos marinos de alta profundidad.',
    tips: 'La velocidad de giro depende de la intensidad media.',
    category: 'Natural'
  },
  nebula_primordial: {
    id: 'nebula_primordial',
    name: 'Nébula Primordial',
    equation: 'P(x,y,z,t) = GasDynamics',
    description: 'Nubes de plasma en formación constante.',
    historicalContext: 'Representación de guarderías estelares.',
    tips: 'Ideal con texturas de nebulosa y alta opacidad de estela.',
    category: 'Natural'
  },
  forest_heart: {
    id: 'forest_heart',
    name: 'Corazón del Bosque',
    equation: 'L-System(growth) * AudioEnergy',
    description: 'Crecimiento de ramas fractales que laten con la música.',
    historicalContext: 'Fractalidad orgánica presente en la botánica.',
    tips: 'Sube la velocidad para ver el bosque crecer.',
    category: 'Orgánico'
  },
  solar_flare: {
    id: 'solar_flare',
    name: 'Llamarada Solar',
    equation: 'E = mc^2 * CoronaLoop',
    description: 'Erupciones de plasma desde un núcleo incandescente.',
    historicalContext: 'Visualización de eyecciones de masa coronal.',
    tips: 'El bajo genera las llamaradas más grandes.',
    category: 'Natural'
  },
  ice_crystals: {
    id: 'ice_crystals',
    name: 'Cristales de Hielo',
    equation: 'Hexagonal(lattice) + Jitter',
    description: 'Formaciones cristalinas frías y angulares.',
    historicalContext: 'Morfogénesis de copos de nieve.',
    tips: 'Usa el tema Volcánico para ver cristales de fuego.',
    category: 'Natural'
  },
  neural_network: {
    id: 'neural_network',
    name: 'Red Neuronal',
    equation: 'Synapse(i,j) = Signal',
    description: 'Disparos eléctricos a través de una red de neuronas.',
    historicalContext: 'Mapa conceptual de conectividad cerebral.',
    tips: 'Cada golpe de caja activa una vía sináptica.',
    category: 'Orgánico'
  },
  firefly_swarm: {
    id: 'firefly_swarm',
    name: 'Enjambre de Luciérnagas',
    equation: 'RandomWalk + Attractor',
    description: 'Cientos de luces errantes que se atraen entre sí.',
    historicalContext: 'Fenómenos de sincronización biológica.',
    tips: 'Mueve el ratón para guiar el enjambre.',
    category: 'Orgánico'
  },
  sand_dunes: {
    id: 'sand_dunes',
    name: 'Dunas de Arena',
    equation: 'Waves(Wind + Audio)',
    description: 'Paisaje esculpido por el viento y el sonido.',
    historicalContext: 'Geomorfología de desiertos.',
    tips: 'El bajo desplaza las dunas en el espacio.',
    category: 'Natural'
  },
  lava_flow: {
    id: 'lava_flow',
    name: 'Flujo de Lava',
    equation: 'Viscosity(t) + HeatHeat',
    description: 'Masa densa y caliente que se desplaza lentamente.',
    historicalContext: 'Cinemática de magmas viscosos.',
    tips: 'Baja la velocidad para un efecto más hipnótico.',
    category: 'Natural'
  },
  stellar_wind: {
    id: 'stellar_wind',
    name: 'Viento Estelar',
    equation: 'RadiationPressure + Gravity',
    description: 'Partículas aceleradas por la presión de luz.',
    historicalContext: 'Interacción de la luz con el polvo cósmico.',
    tips: 'Crea una estela larga para ver las corrientes.',
    category: 'Natural'
  },
  fluido_organico: {
    id: 'fluido_organico',
    name: 'Fluido Orgánico (Aura Display)',
    equation: 'WaveOffset(i) = sin(t * speed + i * F_audio)',
    description: 'Capas fluidas superpuestas inspiradas en dunas de colores líquidos que reaccionan de manera elástica al sonido.',
    historicalContext: 'Modelado procedimental de ondas complejas con suavizado por tramos para pantallas de arte ambiental Aura.',
    tips: 'Sintoniza los bajos para amplificar la ondulación de las capas inferiores.',
    category: 'Orgánico'
  },
  vidriera_roseton: {
    id: 'vidriera_roseton',
    name: 'Rosetón Gótico (Vidriera)',
    equation: 'R_shard = baseRadius * Pulsate(A_instrument), Polygon(V_1, V_2, V_3, V_4)',
    description: 'Estructura geométrica inspirada en las vidrieras de las catedrales góticas. Cada sección de vidrio coloreado reacciona a un instrumento diferente (batería, teclado, voz, bajo, guitarra).',
    historicalContext: 'Inspirado en la arquitectura gótica del siglo XII y la simetría del rosetón como representación de la armonía cósmica.',
    tips: 'Sube la tensión y sensibilidad para ver destellos y mayor brillo en los trozos de vidrio.',
    category: 'Cotidiano'
  },
  artefacto_matematico: {
    id: 'artefacto_matematico',
    name: 'Live Pads (Artefactos de Ecuación)',
    equation: 'v(x,y,t) = v_base(x,y,t) + Σ A_i * Ψ_i(x,y)',
    description: 'Lienzo interactivo gobernado por ecuaciones inyectadas en tiempo real para simular flujos orgánicos independientes.',
    historicalContext: 'Concepto de sintetizador visual por operadores matemáticos, integrando ruido, campo de vectores y audio.',
    tips: 'Usa la pestaña de "Live Pads" para encender perturbadores y formular ecuaciones matemáticas en directo.',
    category: 'Matemática'
  }
};

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: Partial<SimConfig>;
  icon: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'custom_lab',
    name: 'Laboratorio',
    description: 'Configuración base para experimentación manual.',
    icon: '🧪',
    config: {
      geometry: 'lorenz_attractor',
      colorTheme: 'Cyberpunk',
      textureMode: 'neon',
      renderMode: 'puntillismo',
      isMultiLayer: false,
      focusMode: false,
      speed: 0.4,
      force: 1.0,
      scale: 0.7,
      trailOpacity: 0.12,
      bloomIntensity: 0.0
    }
  },
  {
    id: 'deep_ocean',
    name: 'Océano Profundo',
    description: 'Crecimiento orgánico bajo el agua con tonos aurorales.',
    icon: '🌊',
    config: {
      geometry: 'arrecife_coral',
      colorTheme: 'Aurora',
      textureMode: 'glass',
      renderMode: 'acuarela',
      focusMode: true,
      trailOpacity: 0.15,
      bloomIntensity: 1.5,
      scale: 1.2
    }
  },
  {
    id: 'neural_net',
    name: 'Red Neuronal',
    description: 'Conexiones eléctricas de alta frecuencia y neón.',
    icon: '🧠',
    config: {
      geometry: 'red_micelio',
      colorTheme: 'Cyberpunk',
      textureMode: 'neon',
      renderMode: 'puntillismo',
      focusMode: false,
      trailOpacity: 0.05,
      bloomIntensity: 2.2,
      force: 0.8
    }
  },
  {
    id: 'solar_storm',
    name: 'Tormenta Solar',
    description: 'Energía plasmática volcánica en movimiento fluido.',
    icon: '☀️',
    config: {
      geometry: 'campo_flujo',
      colorTheme: 'Volcanic',
      textureMode: 'mercury',
      renderMode: 'oleo',
      trailOpacity: 0.1,
      bloomIntensity: 3.0,
      speed: 0.6
    }
  },
  {
    id: 'liquid_topology',
    name: 'Topología Líquida',
    description: 'Membranas pulsantes de mercurio en el espacio.',
    icon: '💧',
    config: {
      geometry: 'campo_pulsante',
      colorTheme: 'Spectral',
      textureMode: 'mercury',
      renderMode: 'acuarela',
      focusMode: true,
      trailOpacity: 0.2,
      bloomIntensity: 1.0,
      scale: 1.5
    }
  },
  {
    id: 'abstract_cyber',
    name: 'Cyber Abstracción',
    description: 'Geometría vectorial pura con rastro fantasmagórico.',
    icon: '🏮',
    config: {
      geometry: 'atractor_lorenz_83',
      colorTheme: 'Monochromatic',
      textureMode: 'ghost',
      renderMode: 'vectorial',
      trailOpacity: 0.02,
      bloomIntensity: 0.5,
      scale: 1.0,
      force: 1.2
    }
  },
  {
    id: 'deep_space',
    name: 'Espacio Profundo',
    description: 'Constelación reactiva con planetas y estrellas en profundidad.',
    icon: '✨',
    config: {
      geometry: 'constelacion_profunda',
      colorTheme: 'spectral',
      textureMode: 'neon',
      renderMode: 'puntillismo',
      focusMode: true,
      trailOpacity: 0.1,
      bloomIntensity: 2.0,
      scale: 1.2,
      speed: 0.5
    }
  },
  {
    id: 'medusa_bloom',
    name: 'Medusa Bio',
    description: 'Pulsos abisales bioluminiscentes.',
    icon: '🐙',
    config: {
      geometry: 'medusa_bio',
      colorTheme: 'Aurora',
      textureMode: 'ghost',
      renderMode: 'acuarela',
      focusMode: true,
      trailOpacity: 0.08,
      bloomIntensity: 2.5,
      scale: 0.8,
      speed: 0.6
    }
  },
  {
    id: 'flock_motion',
    name: 'Estorninos',
    description: 'Enjambre coreografiado al sonido.',
    icon: '🦅',
    config: {
      geometry: 'flock_murmuration',
      colorTheme: 'spectral',
      textureMode: 'neon',
      renderMode: 'vectorial',
      focusMode: true,
      trailOpacity: 0.15,
      bloomIntensity: 1.5,
      scale: 1.0,
      speed: 0.8
    }
  },
  {
    id: 'abyssal_vortex',
    name: 'Vórtice',
    description: 'Torbellino hipnótico profundo.',
    icon: '🌀',
    config: {
      geometry: 'vortice_abisal',
      colorTheme: 'toxic',
      textureMode: 'mercury',
      renderMode: 'puntillismo',
      focusMode: true,
      trailOpacity: 0.1,
      bloomIntensity: 1.8,
      scale: 1.1,
      speed: 0.6
    }
  },
  {
    id: 'primordial_nebula',
    name: 'Nebula',
    description: 'Gases cósmicos reactivos.',
    icon: '☁️',
    config: {
      geometry: 'nebula_primordial',
      colorTheme: 'Aurora',
      textureMode: 'nebula',
      renderMode: 'oleo',
      focusMode: true,
      trailOpacity: 0.05,
      bloomIntensity: 3.0,
      scale: 0.7,
      speed: 0.8
    }
  },
  {
    id: 'forest_of_light',
    name: 'Bosque',
    description: 'Ramas fractales que crecen con luz.',
    icon: '🌳',
    config: {
      geometry: 'forest_heart',
      colorTheme: 'toxic',
      textureMode: 'glass',
      renderMode: 'vectorial',
      focusMode: true,
      trailOpacity: 0.2,
      bloomIntensity: 1.2,
      scale: 1.2,
      speed: 0.4
    }
  },
  {
    id: 'solar_eruption',
    name: 'Erupción',
    description: 'Energía solar desatada.',
    icon: '☀️',
    config: {
      geometry: 'solar_flare',
      colorTheme: 'volcanic',
      textureMode: 'neon',
      renderMode: 'puntillismo',
      focusMode: true,
      trailOpacity: 0.12,
      bloomIntensity: 4.0,
      scale: 0.9,
      speed: 0.7
    }
  },
  {
    id: 'ice_lattice',
    name: 'Cristal',
    description: 'Geometría gélida perfecta.',
    icon: '❄️',
    config: {
      geometry: 'ice_crystals',
      colorTheme: 'mono',
      textureMode: 'glass',
      renderMode: 'vectorial',
      focusMode: true,
      trailOpacity: 0.05,
      bloomIntensity: 1.0,
      scale: 1.5,
      speed: 0.4
    }
  },
  {
    id: 'neural_spark',
    name: 'Sinapsis',
    description: 'Disparos neuronales eléctricos.',
    icon: '🧠',
    config: {
      geometry: 'neural_network',
      colorTheme: 'cyberpunk',
      textureMode: 'neon',
      renderMode: 'vectorial',
      focusMode: true,
      trailOpacity: 0.3,
      bloomIntensity: 2.2,
      scale: 1.3,
      speed: 1.0
    }
  },
  {
    id: 'firefly_night',
    name: 'Luciérnagas',
    description: 'Enjambre danzante nocturno.',
    icon: '🏮',
    config: {
      geometry: 'firefly_swarm',
      colorTheme: 'Aurora',
      textureMode: 'ghost',
      renderMode: 'puntillismo',
      focusMode: true,
      trailOpacity: 0.06,
      bloomIntensity: 2.5,
      scale: 1.0,
      speed: 0.5
    }
  },
  {
    id: 'audio_dunes',
    name: 'Dunas',
    description: 'Ondas de arena sonoras.',
    icon: '🏜️',
    config: {
      geometry: 'sand_dunes',
      colorTheme: 'volcanic',
      textureMode: 'mercury',
      renderMode: 'oleo',
      focusMode: true,
      trailOpacity: 0.1,
      bloomIntensity: 1.5,
      scale: 0.8,
      speed: 0.6
    }
  },
  {
    id: 'magma_flow',
    name: 'Lava',
    description: 'Flujo ígneo viscoso.',
    icon: '🌋',
    config: {
      geometry: 'lava_flow',
      colorTheme: 'volcanic',
      textureMode: 'nebula',
      renderMode: 'oleo',
      focusMode: true,
      trailOpacity: 0.08,
      bloomIntensity: 2.8,
      scale: 1.1,
      speed: 0.4
    }
  },
  {
    id: 'galactic_wind',
    name: 'Viento',
    description: 'Corrientes de polvo estelar.',
    icon: '💨',
    config: {
      geometry: 'stellar_wind',
      colorTheme: 'spectral',
      textureMode: 'neon',
      renderMode: 'vectorial',
      focusMode: true,
      trailOpacity: 0.25,
      bloomIntensity: 1.6,
      scale: 1.4,
      speed: 1.2
    }
  },
  {
    id: 'liquid_waves',
    name: 'Ondas Fluidas',
    description: 'Fluido orgánico dinámico con capas de color que reaccionan al sonido.',
    icon: '🎨',
    config: {
      geometry: 'fluido_organico',
      colorTheme: 'Cyberpunk',
      textureMode: 'glass',
      renderMode: 'oleo',
      focusMode: true,
      trailOpacity: 0.1,
      bloomIntensity: 2.0,
      scale: 1.0,
      speed: 0.4
    }
  }
];
