

import React, { useState, useEffect, useRef } from 'react';
import { ICONS, IMAGE_PLACEHOLDER } from '../constants';
import { EventType } from '../types';

interface ResourceGalleryModalProps {
  event: EventType;
  onClose: () => void;
}

const ResourceGalleryModal: React.FC<ResourceGalleryModalProps> = ({ event, onClose }) => {
  const { title, galleryUrls = [] } = event;
  const [selectedIndex, setSelectedIndex] = useState(0);

  // New states for zoom and pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startDragPosition = useRef({ x: 0, y: 0 });

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryUrls, selectedIndex]);

  const handlePrev = () => {
    setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : galleryUrls.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prevIndex) => (prevIndex < galleryUrls.length - 1 ? prevIndex + 1 : 0));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = IMAGE_PLACEHOLDER;
  };

  // Zoom handlers
  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5)); // Increased step slightly
  
  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(s - 0.5, 1);
      // If we zoom out to 1 (original size), reset position to center
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Wheel handler for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      startDragPosition.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1 && imageRef.current) {
      e.preventDefault();
      const container = imageRef.current.parentElement;
      if (!container) return;

      // Calculate desired new position based on mouse movement
      const newX = e.clientX - startDragPosition.current.x;
      const newY = e.clientY - startDragPosition.current.y;

      // Calculate boundaries to prevent dragging image off screen
      // The image is centered by default. Scaling grows it from the center.
      // We calculate how much "extra" image exists beyond the container's bounds.
      const width = imageRef.current.offsetWidth;
      const height = imageRef.current.offsetHeight;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Limit X: (ScaledImageWidth - ContainerWidth) / 2
      const maxX = Math.max(0, (width * scale - containerWidth) / 2);
      // Limit Y: (ScaledImageHeight - ContainerHeight) / 2
      const maxY = Math.max(0, (height * scale - containerHeight) / 2);

      // Clamp the position values
      const clampedX = Math.max(-maxX, Math.min(newX, maxX));
      const clampedY = Math.max(-maxY, Math.min(newY, maxY));

      setPosition({
        x: clampedX,
        y: clampedY,
      });
    }
  };

  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);

  // Download handler
  const handleDownload = async () => {
    const originalUrl = galleryUrls[selectedIndex];
    if (!originalUrl) return;

    // Use wsrv.nl as a CORS proxy. It adds the necessary CORS headers.
    // We pass the full original URL to it, as this is supported and used elsewhere in the app.
    const proxyUrl = `https://wsrv.nl/?url=${originalUrl}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Network response not OK from proxy: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = objectUrl;
      // Get a clean filename from the original URL, removing potential query parameters
      const fileName = originalUrl.substring(originalUrl.lastIndexOf('/') + 1).split('?')[0].split('#')[0] || `imagen_${event.id}_${selectedIndex}.jpg`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading image via proxy, falling back to new tab:', error);
      // Fallback: open original image URL in new tab for manual save
      window.open(originalUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl h-full flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 text-white flex-shrink-0">
          <div className='flex-grow min-w-0'>
            <h2 className="text-xl font-display text-amber-300 truncate">{title}</h2>
            <p className="text-sm text-slate-400">
              Galería de Recursos ({selectedIndex + 1} / {galleryUrls.length})
            </p>
          </div>
           {/* Toolbar */}
           <div className="flex items-center gap-2 ml-4">
             <button onClick={handleZoomIn} title="Acercar" className="p-2 rounded-md hover:bg-slate-700 transition-colors">{ICONS.zoomIn}</button>
             <button onClick={handleZoomOut} title="Alejar" disabled={scale <= 1} className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{ICONS.zoomOut}</button>
             <button onClick={handleResetZoom} title="Restaurar" disabled={scale <= 1} className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{ICONS.expand}</button>
             <button onClick={handleDownload} title="Descargar" className="p-2 rounded-md hover:bg-slate-700 transition-colors">{ICONS.download}</button>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white ml-4">{ICONS.close}</button>
        </div>

        {/* Main Image Viewer */}
        <div 
            className="flex-grow flex items-center justify-center p-4 relative min-h-0 overflow-hidden"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={galleryUrls[selectedIndex] || IMAGE_PLACEHOLDER}
            alt={`Recurso ${selectedIndex + 1} para ${title}`}
            className="max-h-full max-w-full object-contain transition-transform duration-200 ease-linear"
            style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`, // Adjust translate by scale to correct movement speed
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onMouseDown={onMouseDown}
            onError={handleImageError}
            draggable="false"
          />
          {/* Navigation Arrows - Only show if not zoomed in excessively to avoid clutter, or check z-index */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white hover:bg-black/60 transition-colors z-10"
            aria-label="Imagen anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white hover:bg-black/60 transition-colors z-10"
            aria-label="Siguiente imagen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Thumbnails */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 z-20 bg-slate-900/80">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {galleryUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex-shrink-0 h-20 bg-black/20 flex items-center justify-center rounded-md overflow-hidden transition-all duration-200 focus:outline-none ${
                  selectedIndex === index ? 'ring-4 ring-amber-400' : 'ring-2 ring-transparent hover:ring-slate-500'
                }`}
              >
                <img
                  src={url || IMAGE_PLACEHOLDER}
                  alt={`Miniatura ${index + 1}`}
                  className="h-full w-auto object-contain"
                  onError={handleImageError}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceGalleryModal;
