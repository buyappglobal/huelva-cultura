
import { EventType, EventCategory } from '../../types';

export const INFO_GALAROZA = "🏞️ Lugares Emblemáticos que Debes Visitar en Galaroza\nConocido como el \"Valle del Agua\" por la Ribera de Múrtiga que lo atraviesa, Galaroza es un pueblo lleno de vida, agua y tradiciones.\n\nIglesia Parroquial de la Purísima Concepción: Un imponente templo del siglo XVII que domina el centro del pueblo, con una torre barroca y un valioso patrimonio artístico en su interior.\n\nErmita de Santa Brígida: Situada en el cerro que acoge el Belén Viviente, esta ermita del siglo XIV es un lugar de gran devoción local y un mirador natural excepcional.\n\nPaseo del Carmen y Fuente de Nuestra Señora del Carmen: El corazón social de Galaroza, un paseo arbolado junto a una fuente-monumento de Aníbal González (arquitecto de la Plaza de España de Sevilla). Un lugar perfecto para relajarse.\n\nArquitectura del Agua: No te pierdas sus numerosas fuentes, pilares y lavaderos que salpican las calles, testimonio de la importancia del agua en la vida del pueblo.\n\n🥾 Ruta de Senderismo Sugerida: Galaroza - Fuenteheridos (Ruta de las Cuestecillas)\nUn sendero que te sumerge en el corazón del Parque Natural.\n\nRecorrido: Galaroza – Fuenteheridos (lineal).\n\nDistancia y Dificultad: Aproximadamente 3 km (solo ida), de dificultad baja. Ideal para un paseo tranquilo.\n\nAtractivo: La ruta discurre entre huertas, castañares y dehesas, siguiendo en parte el curso de la Ribera de Múrtiga. Es un camino lleno de encanto que conecta dos de los pueblos más emblemáticos de la sierra.\n\nConexión: Puedes volver por el mismo camino o continuar hacia otros senderos de la red del parque.\n\n🛣️ Cómo Llegar a Galaroza\n\nDesde Huelva (Capital)\nEn Coche: Toma la N-435 en dirección a Badajoz. Al llegar a la altura de Gibraleón, sigue las indicaciones de la N-435. Pasarás Jabugo antes de llegar a Galaroza (aprox. 1h 25min - 110 km).\n\nEn Autobús: La empresa Damas conecta Huelva con Galaroza, siendo una de las paradas principales de la línea de la sierra.\n\nDesde Sevilla\nEn Coche: Toma la A-66 (Ruta de la Plata) y luego la N-433 (salida 75) dirección Aracena/Portugal. Sigue la N-433 pasando Aracena hasta llegar a Galaroza (aprox. 1h 25min - 115 km).\n\nEn Autobús: Damas ofrece servicios desde Sevilla que pasan por Galaroza.";

export const GALAROZA_EVENTS: EventType[] = [
  {
    "id": "16",
    "title": "Belén Viviente de Galaroza",
    "description": "Galaroza ilumina la Navidad con su Belén Viviente en el Cerro de Santa Brígida. Una representación mágica en un entorno natural único. Días 6, 7, 8, 13, 14, 20, 21, 27 y 28 de diciembre de 18:30 a 20:30 h.",
    "town": "Galaroza",
    "date": "2025-12-06",
    "endDate": "2025-12-28",
    "category": EventCategory.BELEN_VIVIENTE,
    "imageUrl": "https://solonet.es/wp-content/uploads/2025/11/BELEN-GALAROZA.jpg",
    "interestInfo": INFO_GALAROZA
  },
  {
    "id": "navidad-navahermosa",
    "title": "Navidad en Navahermosa",
    "description": "La aldea de Navahermosa (Galaroza) celebra sus fiestas navideñas con convivencias y actividades para todos los vecinos y visitantes.",
    "town": "Galaroza",
    "date": "2025-12-06",
    "category": EventCategory.OTRO,
    "imageUrl": "https://solonet.es/wp-content/uploads/2025/11/AGENDA-TURISTEANDO-ALAJAR-2-Rafael-Caballero-Vazquez-1.png"
  },
  {
    "id": "ruta-amantes-galaroza",
    "title": "Ruta de los Amantes",
    "description": "Descubre el lado más romántico y legendario del Valle del Múrtiga con la 'Ruta de los Amantes'. Este sendero turístico-cultural es una de las joyas de Galaroza, ideal para realizar en pareja o disfrutar de la naturaleza en su estado más poético.\n\nEl recorrido, de dificultad baja-media y aproximadamente 6 kilómetros, parte desde la emblemática Fuente de los Doce Caños. A lo largo del camino, te adentrarás en bosques de castaños y galerías de ribera que parecen sacados de un cuento, escenarios que han inspirado leyendas de amores prohibidos y encuentros furtivos a lo largo de los siglos.\n\nPuntos destacados de la ruta:\n- La Fuente de los Doce Caños: Inicio y fin, el corazón líquido del pueblo.\n- El Cerro de Santa Brígida: Ofrece vistas panorámicas que quitan el aliento.\n- La Era de la Cruz: Un lugar perfecto para el descanso y la contemplación.\n\nEs una oportunidad única para conectar con la naturaleza, respirar aire puro y dejarte envolver por la magia del otoño en la Sierra.",
    "town": "Galaroza",
    "date": "2025-12-07",
    "category": EventCategory.OTRO,
    "imageUrl": "https://solonet.es/wp-content/uploads/2025/11/AGENDA-TURISTEANDO.png",
    "interestInfo": INFO_GALAROZA,
    "itinerary": "**☕ 10:00 - Desayuno Serrano:**\nComienza con fuerza en la Plaza de los Álamos. Pide una tostada de jamón ibérico en el **Casino de la Sociedad** o en los bares cercanos.\n\n**🥾 11:00 - La Ruta:**\nInicia la **Ruta de los Amantes** desde la Fuente de los Doce Caños. Tómalo con calma, haz fotos de los castaños y disfruta del sonido del agua.\n\n**🍽️ 14:30 - Almuerzo:**\nAl volver, recupera energías en el **Restaurante Toribio** o **San Mamés**, degustando setas de temporada o carnes a la brasa.\n\n**📸 17:00 - Paseo Cultural:**\nVisita la **Iglesia de la Purísima Concepción** y la **Ermita del Carmen**. Compra algún dulce artesano antes de irte."
  },
  {
    "id": "festival-musica-antigua-galaroza",
    "title": "Festival de Música Antigua",
    "description": "La localidad serrana estrena una nueva cita cultural que llenará de melodías históricas la Parroquia de la Purísima Concepción durante el mes de diciembre.\n\nLa agenda cultural de la Sierra de Huelva suma un evento de gran calado este invierno. Galaroza se prepara para acoger la primera edición del Festival de Música Antigua de Navidad, una iniciativa que promete fusionar la solemnidad del patrimonio arquitectónico local con la belleza de las composiciones clásicas.\n\nOrganizado por la Asociación de Música y el Belén Viviente de la localidad, este festival nace con la vocación de convertirse en un referente navideño, ofreciendo una programación de excelencia en un entorno inigualable.\n\n📅 Un Programa de Lujo en Dos Jornadas\nEl festival se desarrollará en dos fines de semana consecutivos, convirtiendo los sábados de diciembre en una celebración musical. Ambos conciertos tendrán lugar a las 13:00 horas, un horario ideal para disfrutar de la cultura antes de la gastronomía local, y el escenario elegido será la Parroquia de la Purísima Concepción, un templo que por su acústica y belleza realzará cada nota.\n\nEl cartel de esta primera edición cuenta con dos formaciones de reconocido prestigio:\n\n7 de Diciembre – Ministriles Hispalensis: El festival arranca con esta agrupación especializada. Los \"ministriles\" eran músicos instrumentistas de viento que participaban en las capillas musicales eclesiásticas y en las fiestas profanas de los siglos XV al XVII. Su actuación promete transportarnos a las sonoridades del Renacimiento y el primer Barroco.\n\n14 de Diciembre – Orquesta Barroca de Badajoz: Para el segundo encuentro, el festival sube la apuesta con la presencia de esta orquesta. Especializados en la interpretación histórica, traerán a Galaroza la riqueza, los matices y la emotividad propia del periodo barroco, cerrando el ciclo con broche de oro.\n\n🏛️ Cultura Accesible y Colaboración Local\nUno de los grandes atractivos de este I Festival de Música Antigua de Navidad Galaroza es su carácter abierto: la entrada es totalmente gratuita hasta completar aforo. Esta decisión subraya el compromiso de los organizadores por acercar la alta cultura a todos los vecinos y visitantes.\n\nEl evento es fruto de la colaboración estrecha entre el tejido asociativo y las instituciones, contando con el respaldo de la Parroquia de la Purísima Concepción y el Ayuntamiento de Galaroza.",
    "town": "Galaroza",
    "date": "2025-12-07",
    "endDate": "2025-12-14",
    "category": EventCategory.OTRO,
    "imageUrl": "https://turisteandoporhuelva.es/wp-content/uploads/2025/12/AGENDA-TURISTEANDO-000-19-1.png",
    "galleryUrls": [
      "https://turisteandoporhuelva.es/wp-content/uploads/2025/12/593694321_10241226572227350_8078174333978555656_n-1.jpg"
    ],
    "interestInfo": INFO_GALAROZA,
    "itinerary": "**☕ Mañana:** Paseo matutino por la **Fuente de los Doce Caños**.\n**🎼 13:00 - Concierto:** Asiste al Festival de Música Antigua en la **Parroquia de la Purísima Concepción**. Entrada gratuita.\n**🍽️ Mediodía:** Almuerzo en los bares locales tras el concierto.\n**✨ Tarde:** Si tu visita coincide con las fechas, sube al **Belén Viviente** en el Cerro de Santa Brígida."
  }
];
