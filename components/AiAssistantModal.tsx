

import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { generatePlanFromQuery } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { EventType } from '../types';
import { funFacts } from '../data/funFacts';

interface AiAssistantModalProps {
  onClose: () => void;
  allEvents: EventType[];
}

type Message = {
  sender: 'user' | 'ai' | 'loading' | 'error';
  text: string;
  fact?: string;
};

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose, allEvents }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "¡Hola! Soy tu asistente de viaje para la Sierra. Dime qué fechas o qué tipo de plan buscas y te crearé un itinerario a medida.\n\nPor ejemplo: 'Un plan para el puente de diciembre' o '¿Qué puedo hacer el fin de semana del 6 al 8 de diciembre?'"
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
        const savedKey = sessionStorage.getItem('gemini-api-key');
        if (savedKey) {
          setApiKey(savedKey);
        }
    } catch(e) {
        console.warn("Session storage restricted", e);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) {
      try {
        sessionStorage.setItem('gemini-api-key', trimmedKey);
      } catch(e) {
        console.warn("Could not save to session storage", e);
      }
      setApiKey(trimmedKey);
      setKeyError(null);
    }
  };

  const handleResetApiKey = () => {
    try {
        sessionStorage.removeItem('gemini-api-key');
    } catch(e) {}
    setApiKey(null);
    setApiKeyInput('');
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Error en reconocimiento de voz:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(speechResult);
    };

    recognition.start();
  };

  const handleSubmit = async (e?: React.FormEvent, prompt?: string) => {
    if (isLoading) return;
    if (!apiKey) {
      setKeyError("Por favor, introduce una clave API para continuar.");
      return;
    }

    const userMessage = prompt || input.trim();
    if (!userMessage) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');

    const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    setMessages(prev => [...prev, { sender: 'loading', text: '', fact: randomFact }]);

    try {
      const plan = await generatePlanFromQuery(userMessage, apiKey, allEvents);
      setMessages(prev => prev.filter(m => m.sender !== 'loading'));
      setMessages(prev => [...prev, { sender: 'ai', text: plan }]);
    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        
        setMessages(prev => prev.filter(m => m.sender !== 'loading'));

        if (error.message === 'API_KEY_INVALID') {
            handleResetApiKey();
            setKeyError("La clave API no es válida o no tiene los permisos necesarios. Por favor, introduce una nueva.");
            return;
        }
        
        let errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtalo más tarde o contacta con el administrador.';
        let errorTitle = "Error de Conexión";

        switch(error.message) {
            case 'API_KEY_MISSING':
                errorTitle = "Error de Configuración";
                errorMessage = 'No se ha proporcionado la clave API. Introduce una clave para continuar.';
                break;
            case 'QUOTA_EXCEEDED':
                errorTitle = "Límite de Uso Alcanzado";
                errorMessage = 'Se ha excedido la cuota de la API de Gemini. Por favor, inténtalo más tarde o revisa los límites de tu proyecto de Google Cloud.';
                break;
        }

        setMessages(prev => [...prev, { sender: 'error', text: `**${errorTitle}**\n${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const quickActionButton = (text: string) => (
    <button 
        key={text}
        onClick={() => handleSubmit(undefined, text)}
        disabled={isLoading}
        className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {text}
    </button>
  );

  const renderApiKeyScreen = () => (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300 flex items-center gap-2">
          {ICONS.magic} Configurar Asistente
        </h2>
        <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <h3 className="text-lg font-bold">Introduce tu Clave API de Gemini</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-4">
          Para usar el planificador de viaje, necesitas una clave API de Google AI Studio. Tu clave se guardará de forma segura en la sesión de tu navegador y no será compartida.
        </p>
        {keyError && (
          <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 p-3 rounded-md text-sm mb-4">
            {keyError}
          </div>
        )}
        <form onSubmit={handleApiKeySubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Clave API</label>
            <input
              id="apiKey"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Pega tu clave aquí (empieza con AIza...)"
              className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="w-full p-3 bg-amber-400 text-slate-900 font-bold rounded-md hover:bg-amber-500 transition-colors" disabled={!apiKeyInput.trim()}>
            Guardar y Continuar
          </button>
        </form>
         <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
          ¿No tienes una clave? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Obtenla aquí</a>.
        </p>
      </div>
    </div>
  );
  
   if (!apiKey) {
    return (
       <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in" onClick={onClose}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg h-auto flex flex-col" onClick={e => e.stopPropagation()}>
              {renderApiKeyScreen()}
          </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300 flex items-center gap-2">
            {ICONS.magic} Planificador de Viaje IA
          </h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {messages.map((msg, index) => {
            if (msg.sender === 'loading') {
              return (
                <div key={index} className="flex items-start gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-300">{ICONS.magic}</div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg w-full max-w-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="font-bold text-slate-700 dark:text-slate-300">Preparando tu plan...</p>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-3">
                      <p className="font-semibold">¿Sabías que...?</p>
                      <p className="italic">{msg.fact}</p>
                    </div>
                  </div>
                </div>
              );
            }
            if (msg.sender === 'error') {
                 return (
                    <div key={index} className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-800 dark:text-red-300 p-4 rounded-r-lg">
                        <MarkdownRenderer text={msg.text} />
                    </div>
                );
            }
            return (
              <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-start gap-3 w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-300">{ICONS.magic}</div>
                    )}
                    <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'ai' ? 'bg-slate-100 dark:bg-slate-700' : 'bg-amber-400 text-slate-900'}`}>
                    <MarkdownRenderer text={msg.text} />
                    </div>
                </div>
              </div>
            );
          })}
          {messages.filter(m => m.sender === 'ai').length === 1 && (
            <div className="flex flex-wrap justify-end gap-2 pt-2">
                {quickActionButton("Un plan para el puente de diciembre")}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={isLoading ? "El asistente está pensando..." : "Escribe tu petición aquí..."}
            className="w-full p-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
            disabled={isLoading}
          />
           <button
            type="button"
            onClick={handleVoiceInput}
            className={`p-3 rounded-md transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Usar micrófono"
            disabled={isLoading}
          >
            {ICONS.mic}
          </button>
          <button type="submit" onClick={() => handleSubmit()} className="p-3 bg-amber-400 text-slate-900 rounded-md hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading || !input.trim()}>
            {ICONS.send}
          </button>
        </div>
        <div className="text-center pb-2">
            <button onClick={handleResetApiKey} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                Cambiar Clave API
            </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantModal;
