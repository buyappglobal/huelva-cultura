import { promises as fs } from 'fs';
import path from 'path';
import { EventType } from './types'; // Importamos el tipo centralizado

async function getData(): Promise<EventType[]> {
    const filePath = path.join(process.cwd(), 'database.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    // Aseguramos que los datos leídos se ajustan al tipo EventType
    const data: EventType[] = JSON.parse(fileContents);
    return data;
}

export async function getTowns() {
    const events = await getData();
    const townNames = [...new Set(events.map(event => event.town))];

    return townNames.map(name => {
        const eventForTown = events.find(event => event.town === name);
        return {
            name: name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            // Usamos la primera imagen que encontremos para el pueblo como miniatura
            imageUrl: eventForTown?.imageUrl,
        };
    });
}

export async function getTownBySlug(slug: string) {
    const events = await getData();
    const townName = slug.replace(/-/g, ' ');
    // Buscamos el primer evento que coincida con el nombre del pueblo (insensible a mayúsculas)
    const eventForTown = events.find(event => event.town.toLowerCase() === townName);
    return eventForTown; // Esto contendrá el 'interestInfo' y otros datos
}