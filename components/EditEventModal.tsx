
import React, { useState, useEffect } from 'react';
import { EventType, EventCategory } from '../types';
import { TOWNS, ICONS } from '../constants';

interface EditEventModalProps {
  event: EventType;
  onClose: () => void;
  onUpdate: (event: EventType) => void;
  onDelete: (eventId: string) => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ event, onClose, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState<EventType>(event);
  const [imagePreview, setImagePreview] = useState<string | null>(event.imageUrl || null);


  useEffect(() => {
    setFormData(event);
    setImagePreview(event.imageUrl || null);
  }, [event]);

  // Función para convertir enlaces de Google Drive en enlaces directos de imagen
  const processImageUrl = (url: string): string => {
    // Detectar enlaces de Google Drive estándar
    if (url.includes('drive.google.com') && url.includes('/d/')) {
        const idMatch = url.match(/\/d\/([^/]+)/);
        if (idMatch && idMatch[1]) {
            // Convertir a formato de exportación directa
            return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
        }
    }
    return url;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        let finalValue = value;
        
        // Si cambiamos la URL de la imagen manualmente, actualizamos la previsualización
        if (name === 'imageUrl') {
            finalValue = processImageUrl(value);
            setImagePreview(finalValue);
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  // Gallery Handlers
  const handleAddGalleryUrl = () => {
    setFormData(prev => ({
      ...prev,
      galleryUrls: [...(prev.galleryUrls || []), '']
    }));
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      galleryUrls: (prev.galleryUrls || []).filter((_, i) => i !== index)
    }));
  };

  const handleGalleryUrlChange = (index: number, value: string) => {
    const processedValue = processImageUrl(value);
    const newUrls = [...(formData.galleryUrls || [])];
    newUrls[index] = processedValue;
    setFormData(prev => ({ ...prev, galleryUrls: newUrls }));
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { 
        ...formData,
        galleryUrls: (formData.galleryUrls || []).filter(url => url.trim() !== '')
    };
    
    // Clean up empty endDate
    if (!submissionData.endDate) {
        delete submissionData.endDate;
    }
    onUpdate(submissionData);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el evento "${event.title}"?`)) {
      onDelete(event.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <form onSubmit={handleUpdate} className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Editar Evento</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
              <label htmlFor="title" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Título del Evento</label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" required />
            </div>

            <div className="flex items-center">
                <input
                    id="sponsoredEdit"
                    name="sponsored"
                    type="checkbox"
                    checked={!!formData.sponsored}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="sponsoredEdit" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                    Marcar como evento destacado
                </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="town" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Pueblo</label>
                <select name="town" id="town" value={formData.town} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" required>
                  {TOWNS.map(town => <option key={town.id} value={town.name}>{town.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
                <div className="flex-1">
                    <label htmlFor="date" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Inicio</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" required />
                </div>
                <div className="flex-1">
                    <label htmlFor="endDate" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Fecha Fin (Opcional)</label>
                    <input type="date" name="endDate" id="endDate" value={formData.endDate || ''} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" />
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="category" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
                    <select name="category" id="category" value={formData.category} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" required>
                      {Object.values(EventCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                     <label htmlFor="externalUrl" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">URL Externa</label>
                     <input type="url" name="externalUrl" id="externalUrl" value={formData.externalUrl || ''} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" placeholder="https://..." />
                </div>
            </div>

            <div>
              <label htmlFor="description" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
              <textarea name="description" id="description" rows={3} value={formData.description} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400" required></textarea>
            </div>

             {/* Campos extra de información */}
             <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Detalles Generados por IA</h4>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="interestInfo" className="block mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Info Turística</label>
                        <textarea name="interestInfo" id="interestInfo" rows={2} value={formData.interestInfo || ''} onChange={handleChange} className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"></textarea>
                    </div>
                    <div>
                        <label htmlFor="itinerary" className="block mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Itinerario</label>
                        <textarea name="itinerary" id="itinerary" rows={2} value={formData.itinerary || ''} onChange={handleChange} className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"></textarea>
                    </div>
                </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Imagen Principal del Evento (URL)</label>
              <div className="mb-2">
                  <input 
                    type="text" 
                    name="imageUrl" 
                    placeholder="https://..." 
                    value={formData.imageUrl || ''} 
                    onChange={handleChange}
                    className="w-full p-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400"
                  />
              </div>

              <div className="mt-2 flex items-center gap-4">
                {imagePreview ? (
                    <img src={imagePreview} alt="Previsualización" className="h-20 w-20 rounded-md object-cover border border-slate-300 dark:border-slate-600" />
                ) : (
                    <div className="h-20 w-20 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                )}
                 {imagePreview && (
                    <button type="button" onClick={handleRemoveImage} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs font-semibold">
                        Quitar Imagen
                    </button>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Galería de Imágenes (Opcional)</label>
              
              <div className="space-y-2">
                {(formData.galleryUrls || []).map((url, index) => (
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
                      title="Eliminar imagen"
                    >
                      {ICONS.trash}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddGalleryUrl}
                className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                {ICONS.add} Añadir imagen a la galería
              </button>
              
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Añade URLs de carteles, horarios, etc.</p>
            </div>
        </div>

        <div className="flex justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto">
           <div className="flex gap-2">
              <button type="button" onClick={handleDelete} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2 px-3 rounded-md transition-colors text-sm flex items-center gap-1">
                {ICONS.trash} Borrar Evento
              </button>
           </div>
           <div className="flex gap-2">
               <button type="button" onClick={onClose} className="bg-slate-500 dark:bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
               <button type="submit" className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors">Guardar</button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default EditEventModal;
