
import { EventType, EventCategory } from '../../types';

export const INFO_PUERTO_MORAL = "🏞️ Lugares Emblemáticos que Debes Visitar en Puerto Moral\nPuerto Moral es un pequeño y tranquilo pueblo serrano, un remanso de paz ideal para desconectar.\n\nIglesia de San Pedro y San Pablo: Un pequeño y coqueto templo de estilo mudéjar.\n\nLavaderos Públicos: Un rincón etnográfico bien conservado.\n\nEmbalse de Aracena: El pueblo se encuentra muy cerca de la cola del embalse, ofreciendo paisajes de agua y dehesa muy bonitos.";

export const PUERTO_MORAL_EVENTS: EventType[] = [
  {
    "id": "belen-puerto-moral",
    "title": "Belén Viviente de Puerto Moral",
    "description": "El Belén Viviente de Puerto Moral es una de las tradiciones navideñas más emblemáticas de la Sierra de Aracena y la provincia de Huelva. Se celebra el 6 y 7 de diciembre en el Barranco de la Madrona, con más de 100 figurantes.",
    "town": "Puerto Moral",
    "date": "2025-12-06",
    "endDate": "2025-12-07",
    "category": EventCategory.BELEN_VIVIENTE,
    "imageUrl": "https://solonet.es/wp-content/uploads/2025/10/WhatsApp-Image-2025-10-30-at-08.00.19.jpeg",
    "interestInfo": INFO_PUERTO_MORAL
  },
  {
    "id": "zambomba-puerto-moral-2025",
    "title": "Zambomba Navideña",
    "description": "El espíritu de la Navidad llega a la Sierra de Aracena de la mano de la Zambomba Navideña de Puerto Moral 2025. El Ayuntamiento de la localidad onubense invita a vecinos y visitantes a sumergirse en una tarde-noche llena de tradición, música y solidaridad.\n\n📅 Fecha y Lugar Clave\nMarca en tu calendario el viernes 12 de diciembre. La celebración tendrá como escenario la emblemática Plaza San Pedro y San Pablo, el corazón de Puerto Moral.\n\n📸 Comenzando la Tarde: El Photoball Navideño\nLa jornada arrancará a las 17:00 horas con un momento perfecto para el recuerdo: el Photocoll Bola de Navidad. Una oportunidad ideal para capturar la esencia de la fiesta y llevarse un recuerdo original de la Navidad 2025 en la Sierra de Huelva.\n\n🎶 El Gran Evento: La Zambomba Flamenca \"El Enreo\"\nEl ambiente se calentará a las 20:00 horas con la llegada de la tradición flamenca. Disfruta de la auténtica Zambomba Flamenca a cargo del grupo \"El Enreo\", que llenará la plaza de compás, alegría y los villancicos más sentidos y vibrantes de Andalucía. Un espectáculo que garantiza transportarte a la esencia más pura de la Navidad andaluza.\n\n🤝 Un Gesto Solidario: Dulce Sabor a Colaboración\nPero esta fiesta no solo alimenta el alma con música, sino también el paladar y el compromiso social. Durante el evento, se ofrecerá una exquisita degustación de chocolate y dulces caseros elaborados con cariño.\n\nEsta degustación tiene un fin solidario, ya que se realizará a beneficio de la Asociación de Mujeres \"La Espiga\". Tu participación será un valioso apoyo a esta importante asociación local, haciendo que la celebración tenga un impacto positivo en la comunidad.",
    "town": "Puerto Moral",
    "date": "2025-12-12",
    "category": EventCategory.FIESTA,
    "imageUrl": "https://turisteandoporhuelva.es/wp-content/uploads/2025/12/AGENDA-TURISTEANDO-000.png",
    "galleryUrls": [
      "https://turisteandoporhuelva.es/wp-content/uploads/2025/12/592146717_1295712049261882_2237142378531841414_n.jpg"
    ],
    "interestInfo": INFO_PUERTO_MORAL,
    "itinerary": "**📸 17:00 - Photocall:** Hazte una foto divertida en la Bola de Navidad gigante.\n**☕ Merienda:** Disfruta del chocolate con dulces caseros de la Asoc. de Mujeres \"La Espiga\".\n**💃 20:00 - Zambomba:** Vive el flamenco y los villancicos con el grupo \"El Enreo\" en la Plaza San Pedro y San Pablo."
  }
];
