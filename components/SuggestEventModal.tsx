
import React, { useState } from 'react';
import { ICONS, TOWNS } from '../constants';
import { EventCategory } from '../types';

interface SuggestEventModalProps {
  onClose: () => void;
}

const SuggestEventModal: React.FC<SuggestEventModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    town: TOWNS[0].name,
    date: '',
    endDate: '',
    category: EventCategory.OTRO,
    description: '',
    interestInfo: '',
    itinerary: '',
    externalUrl: '',
    imageUrl: '',
    galleryUrls: [''] as string[]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGalleryUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.galleryUrls];
    newUrls[index] = value;
    setFormData(prev => ({ ...prev, galleryUrls: newUrls }));
  };

  const handleAddGalleryUrl = () => {
    setFormData(prev => ({ ...prev, galleryUrls: [...prev.galleryUrls, ''] }));
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      galleryUrls: prev.galleryUrls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filtramos URLs vacías
    const validGalleryUrls = formData.galleryUrls.filter(url => url.trim() !== '');
    
    // Construimos la lista de galería para el email
    const galleryText = validGalleryUrls.length > 0 
        ? validGalleryUrls.map(url => `- ${url}`).join('\n')
        : 'Ninguna';

    // Construimos el cuerpo del correo
    const body = `
Hola Admin, me gustaría sugerir el siguiente evento para la Agenda Cultural:

--- DATOS DEL EVENTO ---
Título: ${formData.title}
Fecha Inicio: ${formData.date}
Fecha Fin: ${formData.endDate || 'No indicada'}

Pueblo: ${formData.town}
Categoría: ${formData.category}

Descripción:
${formData.description}

Información Turística (Interest Info):
${formData.interestInfo || 'No proporcionada'}

Plan de Día (Itinerario):
${formData.itinerary || 'No proporcionado'}

URL Externa:
${formData.externalUrl || 'No proporcionada'}

Imagen Principal:
${formData.imageUrl}

Galería de Imágenes:
${galleryText}
------------------------
    `.trim();

    const subject = `Sugerencia de Evento: ${formData.title}`;
    
    // Usamos encodeURIComponent para asegurar que los saltos de línea y caracteres especiales funcionen bien
    const mailtoLink = `mailto:buyappglobal@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoLink, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Sugerir Evento</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded text-sm text-blue-800 dark:text-blue-300 mb-4">
            <p>Rellena los datos y pulsa "Enviar". Se abrirá tu correo para que mandes la información al administrador.</p>
          </div>

          <div className="relative my-4">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
                 <div className="w-full border-t border-slate-200 dark:border-slate-700" />
             </div>
             <div className="relative flex justify-center">
                 <span className="bg-white dark:bg-slate-800 px-2 text-sm text-slate-500">Datos Principales</span>
             </div>
         </div>

          <div>
            <label htmlFor="title" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Título del Evento *</label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" required placeholder="Ej: Zambombá Solidaria..." />
          </div>

          <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="date" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Inicio *</label>
                <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" required />
              </div>
              <div className="flex-1">
                <label htmlFor="endDate" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Fin (Opcional)</label>
                <input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label htmlFor="town" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Pueblo *</label>
                <select name="town" id="town" value={formData.town} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" required>
                  {TOWNS.map(town => <option key={town.id} value={town.name}>{town.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="category" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Categoría *</label>
                <select name="category" id="category" value={formData.category} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" required>
                  {Object.values(EventCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Descripción *</label>
            <textarea name="description" id="description" rows={3} value={formData.description} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" required placeholder="Horario, lugar exacto, precio..."></textarea>
          </div>

          {/* Nuevos Campos Opcionales */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Detalles Adicionales (Opcional)</h3>
             
             <div>
                <label htmlFor="interestInfo" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Información Turística</label>
                <textarea name="interestInfo" id="interestInfo" rows={2} value={formData.interestInfo} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" placeholder="Lugares emblemáticos, curiosidades del pueblo..."></textarea>
             </div>

             <div>
                <label htmlFor="itinerary" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Plan de Día (Itinerario)</label>
                <textarea name="itinerary" id="itinerary" rows={2} value={formData.itinerary} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" placeholder="Mañana: Visita castillo... Mediodía: Almuerzo..."></textarea>
             </div>

             <div>
                <label htmlFor="externalUrl" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">URL Externa</label>
                <input type="url" name="externalUrl" id="externalUrl" value={formData.externalUrl} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" placeholder="https://..." />
             </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <label htmlFor="imageUrl" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Imagen Principal (URL)</label>
            <input type="text" name="imageUrl" id="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400" placeholder="https://..." />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {ICONS.gallery} Galería de Imágenes (Opcional)
              </label>
              <p className="text-xs text-slate-500 mb-2">Añade enlaces a carteles, horarios o fotos adicionales.</p>
              
              <div className="space-y-2">
                {formData.galleryUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleGalleryUrlChange(index, e.target.value)}
                      className="flex-1 p-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400"
                      placeholder="https://..."
                    />
                    <button
                        type="button"
                        onClick={() => handleRemoveGalleryUrl(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="Eliminar línea"
                        disabled={formData.galleryUrls.length === 1 && formData.galleryUrls[0] === ''}
                    >
                        {ICONS.trash}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddGalleryUrl}
                className="mt-3 text-sm text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                {ICONS.add} Añadir otra URL
              </button>
          </div>

        </div>

        <div className="flex justify-end items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto">
          <button type="button" onClick={onClose} className="bg-slate-500 dark:bg-slate-600 text-white font-bold py-2 px-6 rounded-md hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
          <button type="submit" className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors flex items-center gap-2">
            {ICONS.email} Enviar Sugerencia
          </button>
        </div>
      </form>
    </div>
  );
};

export default SuggestEventModal;
