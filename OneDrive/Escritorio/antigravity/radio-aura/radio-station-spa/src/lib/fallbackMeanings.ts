const FALLBACK_MEANINGS = [
  "Una composición original de la sintonía de Aura Radio, diseñada para fluir de forma armónica en tu jornada.",
  "Este tema forma parte del universo sonoro de Aura Radio, donde cada nota encuentra su momento exacto.",
  "Música seleccionada con intención: para acompañar, no para interrumpir. Tu espacio, tu banda sonora.",
  "Un fragmento del tejido sonoro de Aura Radio. Déjalo sonar y que encuentre su lugar en tu día.",
  "Curado para crear el ambiente perfecto. En Aura Radio, el silencio entre notas también tiene peso.",
  "Este sonido fue elegido para equilibrar tu espacio interior. Escúchalo sin buscar destino.",
  "Parte de la arquitectura sonora de Aura Radio: música que no compite con tu momento, sino que lo completa.",
  "Cada pista en Aura Radio es una elección consciente. Este es tu momento para simplemente escuchar.",
  "La sintonía perfecta para cuando las palabras sobran. Solo música, solo este instante.",
  "Un viaje sonoro sin mapa definido. Aquí es donde el sonido de Aura Radio se convierte en tuyo.",
];

export function getFallbackMeaning(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_MEANINGS[hash % FALLBACK_MEANINGS.length];
}
