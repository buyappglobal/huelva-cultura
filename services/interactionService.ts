
import { EventType } from '../types';

interface InteractionData {
  likes: Record<string, boolean>; // eventId -> isLiked
  attending: Record<string, boolean>; // eventId -> isAttending
  viewed: Record<string, boolean>; // eventId -> hasBeenViewed (to prevent double counting in session)
}

const STORAGE_KEY = 'sierra_navidad_interactions';

// Simple hash function to generate deterministic pseudo-random numbers from a string
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Generate base metrics based on event ID so they look real and consistent (not starting at 0)
const generateBaseMetrics = (eventId: string) => {
  const seed = simpleHash(eventId);
  
  // Base views: between 150 and 2000
  const views = (seed % 1850) + 150;
  
  // Base likes: roughly 10-20% of views
  const likes = Math.floor(views * ((seed % 10 + 10) / 100));
  
  // Base attendees: roughly 5-15% of views
  const attendees = Math.floor(views * ((seed % 10 + 5) / 100));

  return { views, likes, attendees };
};

// Get stored user interactions
const getStoredInteractions = (): InteractionData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('LocalStorage access blocked or unavailable', e);
  }
  return { likes: {}, attending: {}, viewed: {} };
};

// Save user interactions
const saveInteractions = (data: InteractionData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage write blocked or unavailable', e);
  }
};

export const getEventMetrics = (event: EventType) => {
  const base = generateBaseMetrics(event.id);
  const userInteractions = getStoredInteractions();

  const isFavorite = !!userInteractions.likes[event.id];
  const isAttending = !!userInteractions.attending[event.id];
  
  // Add 1 to counts if the user has interacted
  // Note: For views, we assume if they are loading this, they are viewing it.
  // Real view increment happens in the component effect.
  
  return {
    ...event,
    views: base.views + (userInteractions.viewed[event.id] ? 1 : 0),
    likes: base.likes + (isFavorite ? 1 : 0),
    attendees: base.attendees + (isAttending ? 1 : 0),
    isFavorite,
    isAttending
  };
};

export const toggleLikeEvent = (eventId: string): boolean => {
  const data = getStoredInteractions();
  const newState = !data.likes[eventId];
  
  if (newState) {
    data.likes[eventId] = true;
  } else {
    delete data.likes[eventId];
  }
  
  saveInteractions(data);
  return newState;
};

export const toggleAttendEvent = (eventId: string): boolean => {
  const data = getStoredInteractions();
  const newState = !data.attending[eventId];
  
  if (newState) {
    data.attending[eventId] = true;
  } else {
    delete data.attending[eventId];
  }
  
  saveInteractions(data);
  return newState;
};

export const incrementViewEvent = (eventId: string) => {
  const data = getStoredInteractions();
  if (!data.viewed[eventId]) {
    data.viewed[eventId] = true;
    saveInteractions(data);
    return true; // incremented
  }
  return false; // already viewed
};
