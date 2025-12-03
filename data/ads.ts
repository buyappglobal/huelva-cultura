
import { EventType, EventCategory } from '../types';

export const ADS: EventType[] = [
    {
        id: "ad-dinosaurio-goloso",
        title: "El Dinosaurio Goloso",
        description: "¡Los mejores dulces, pasteles y desayunos artesanos de la Sierra! Ven a visitarnos y date un capricho inolvidable.",
        town: "Santa Olalla del Cala", // Ubicación corregida
        date: "2025-12-31", // Fecha futura para asegurar visibilidad
        category: EventCategory.OTRO,
        imageUrl: "https://solonet.es/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-14-at-14.36.15.jpeg",
        externalUrl: "https://www.instagram.com/el_dino_goloso/",
        sponsored: true
    }
];
