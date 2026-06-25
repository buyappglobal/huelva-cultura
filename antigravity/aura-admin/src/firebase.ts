// Custom API Database compatibility layer for SQLite/D1 Cloudflare pages functions inside aura-admin.
// Path: src/firebase.ts

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Database Error: ', error, operationType, path);
  throw error;
}

export const db = {};
export const storage = {};

class MockAuth {
  private listeners: Array<(user: any) => void> = [];

  constructor() {
    window.addEventListener('storage', () => {
      this.triggerListeners();
    });
  }

  get currentUser() {
    const userJson = localStorage.getItem('aura_user');
    if (!userJson) return null;
    try {
      const u = JSON.parse(userJson);
      return {
        uid: u.id,
        id: u.id,
        email: u.email,
        role: u.role,
        hasAdsPanel: !!u.hasAdsPanel,
        hasImpulses: !!u.hasImpulses,
        city: u.city,
        slug: u.slug,
        emailVerified: true,
        isAnonymous: false,
        providerData: []
      };
    } catch (e) {
      return null;
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    setTimeout(() => callback(this.currentUser), 0);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  triggerListeners() {
    const user = this.currentUser;
    this.listeners.forEach(callback => callback(user));
  }

  async signOut() {
    localStorage.removeItem('aura_user');
    this.triggerListeners();
  }
}

export const auth = new MockAuth();

export function getAuth(app?: any) {
  return auth;
}

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Login failed');
  }
  const data = await response.json();
  localStorage.setItem('aura_user', JSON.stringify(data.user));
  auth.triggerListeners();
  return { user: auth.currentUser };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Registration failed');
  }
  const data = await response.json();
  return { user: { uid: data.userId, email } };
}

export async function signOut(authInstance: any) {
  await auth.signOut();
}

export class GoogleAuthProvider {}

export function doc(dbInstance: any, collectionName: string, ...segments: string[]) {
  return {
    type: 'doc',
    collectionName,
    id: segments.join('/'),
    path: `${collectionName}/${segments.join('/')}`
  };
}

export function collection(dbInstance: any, collectionName: string) {
  return {
    type: 'collection',
    collectionName,
    path: collectionName
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    ...collectionRef,
    constraints
  };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export function orderBy(field: string, dir: string = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function serverTimestamp() {
  return Date.now();
}

export function increment(n: number) {
  return { type: 'increment', value: n };
}

export function arrayUnion(...items: any[]) {
  return { type: 'arrayUnion', items };
}

export function arrayRemove(...items: any[]) {
  return { type: 'arrayRemove', items };
}

export function initializeApp(config?: any, name?: string) {
  return {};
}

export function deleteApp(app?: any) {
  return Promise.resolve();
}

export function onSnapshot(docRef: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  let active = true;
  
  const fetchAndTrigger = async () => {
    try {
      if (docRef.collectionName === 'displays' && docRef.id === 'global') {
        const response = await fetch('/api/displays/global');
        if (response.ok) {
          const data = await response.json();
          if (active) {
            onNext({
              exists: () => true,
              data: () => data.display || {}
            });
          }
        }
      }
    } catch (e) {
      if (active && onError) onError(e);
    }
  };

  fetchAndTrigger();
  return () => {
    active = false;
  };
}
