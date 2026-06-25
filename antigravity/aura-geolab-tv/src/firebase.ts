// --- CUSTOM FIREBASE COMPATIBILITY LAYER FOR SQLITE / EDGE ---
// Real Firebase SDK imports removed as all authentication is now handled locally via D1/Cloudflare OTP.


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Mock Firestore Error: ', error, operationType, path);
  throw error;
}

// 1. Core instances
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

// 2. Auth functions
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
export async function signInWithPopup(authInstance: any, provider: any) {
  throw new Error("Google Sign In is not supported on this platform.");
}

export function initializeApp(config?: any, name?: string) {
  return {};
}
export function deleteApp(app?: any) {
  return Promise.resolve();
}

// 3. Firestore functions
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

export async function getDoc(docRef: any) {
  if (docRef.collectionName === 'displays' || docRef.collectionName === 'users') {
    const response = await fetch(`/api/displays/${docRef.id}`);
    if (!response.ok) {
      return { exists: () => false, data: () => null };
    }
    const data = await response.json();
    const payload = docRef.collectionName === 'users' ? data.user : data.display;
    if (!payload) {
      return { exists: () => false, data: () => null };
    }
    return {
      id: docRef.id,
      exists: () => true,
      data: () => ({
        ...payload,
        lastSeen: payload.updatedAt ? { toMillis: () => payload.updatedAt } : null
      })
    };
  }
  
  if (docRef.collectionName === 'pairingCodes') {
    const response = await fetch(`/api/tv/pairing/${docRef.id}`);
    if (!response.ok) {
      return { exists: () => false, data: () => null };
    }
    const data = await response.json();
    if (data.pending) {
      return {
        id: docRef.id,
        exists: () => true,
        data: () => ({
          expiresAt: Date.now() + 10 * 60 * 1000,
          linkedClientId: null
        })
      };
    }
    return {
      id: docRef.id,
      exists: () => true,
      data: () => ({
        expiresAt: Date.now() + 10 * 60 * 1000,
        linkedClientId: data.clientId
      })
    };
  }

  return { exists: () => false, data: () => null };
}

export const getDocFromServer = getDoc;

export async function getDocs(queryOrCol: any) {
  if (queryOrCol.collectionName === 'users') {
    const whereSlug = queryOrCol.constraints?.find((c: any) => c.type === 'where' && c.field === 'slug');
    const whereEmail = queryOrCol.constraints?.find((c: any) => c.type === 'where' && c.field === 'email');
    
    if (whereSlug) {
      const response = await fetch(`/api/displays/${whereSlug.value}`);
      if (!response.ok) {
        return { empty: true, docs: [] };
      }
      const data = await response.json();
      if (!data.user) return { empty: true, docs: [] };
      return {
        empty: false,
        docs: [{
          id: data.user.id,
          data: () => data.user
        }]
      };
    }

    if (whereEmail) {
      const response = await fetch(`/api/admin/users`);
      if (!response.ok) {
        return { empty: true, docs: [] };
      }
      const data = await response.json();
      const matched = data.users.filter((u: any) => u.email === whereEmail.value);
      return {
        empty: matched.length === 0,
        docs: matched.map((u: any) => ({
          id: u.id,
          data: () => u
        }))
      };
    }

    const response = await fetch(`/api/admin/users`);
    if (!response.ok) {
      return { empty: true, docs: [] };
    }
    const data = await response.json();
    return {
      empty: data.users.length === 0,
      docs: data.users.map((u: any) => ({
        id: u.id,
        data: () => u
      }))
    };
  }

  if (queryOrCol.collectionName === 'displays') {
    const response = await fetch(`/api/admin/displays`);
    if (!response.ok) {
      return { empty: true, docs: [] };
    }
    const data = await response.json();
    return {
      empty: data.displays.length === 0,
      docs: data.displays.map((d: any) => ({
        id: d.id,
        data: () => d
      }))
    };
  }

  return { empty: true, docs: [] };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (docRef.collectionName === 'displays') {
    if (data.contents && data.contents.type === 'arrayUnion') {
      for (const item of data.contents.items) {
        await fetch(`/api/displays/${docRef.id}/contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
      return;
    }
    if (data.quotes && data.quotes.type === 'arrayUnion') {
      for (const item of data.quotes.items) {
        await fetch(`/api/displays/${docRef.id}/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
      return;
    }

    const response = await fetch(`/api/displays/${docRef.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Failed to set display config");
    }
    return;
  }

  if (docRef.collectionName === 'users') {
    const response = await fetch(`/api/admin/users/${docRef.id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Failed to set user details");
    }
    return;
  }
}

export async function updateDoc(docRef: any, data: any) {
  if (docRef.collectionName === 'displays') {
    if (data.contents && data.contents.type === 'arrayRemove') {
      for (const item of data.contents.items) {
        if (item.id) {
          await fetch(`/api/displays/${docRef.id}/contents/${item.id}`, {
            method: 'DELETE'
          });
        }
      }
      return;
    }
    if (data.quotes && data.quotes.type === 'arrayRemove') {
      for (const item of data.quotes.items) {
        if (item.id) {
          await fetch(`/api/displays/${docRef.id}/quotes/${item.id}`, {
            method: 'DELETE'
          });
        }
      }
      return;
    }

    const response = await fetch(`/api/displays/${docRef.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Failed to update display config");
    }
    return;
  }

  if (docRef.collectionName === 'users') {
    const response = await fetch(`/api/admin/users/${docRef.id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Failed to update user");
    }
    return;
  }

  if (docRef.collectionName === 'pairingCodes') {
    if (data.linkedClientId) {
      const response = await fetch(`/api/admin/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: docRef.id, clientId: data.linkedClientId })
      });
      if (!response.ok) {
        throw new Error("Failed to pair screen");
      }
    }
    return;
  }
}

export async function addDoc(collectionRef: any, data: any) {
  console.log("Mock password reset request:", data);
  return { id: "reset_" + Date.now() };
}

export function onSnapshot(docRef: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  let active = true;
  
  const fetchAndTrigger = async () => {
    try {
      const snap = await getDoc(docRef);
      if (active) onNext(snap);
    } catch (e) {
      if (active && onError) onError(e);
    }
  };

  fetchAndTrigger();

  let sse: EventSource | null = null;
  if (docRef.collectionName === 'displays' || docRef.collectionName === 'users') {
    sse = new EventSource(`/api/tv/${docRef.id}/events`);
    sse.addEventListener('config_sync', () => {
      fetchAndTrigger();
    });
    sse.addEventListener('force_skip', () => {
      fetchAndTrigger();
    });
  }

  return () => {
    active = false;
    if (sse) sse.close();
  };
}

// 4. Storage mock functions
export function ref(storageInstance: any, path: string) {
  return { type: 'storage_ref', path };
}

export async function uploadBytes(refInstance: any, blob: Blob, metadata?: any) {
  const parts = refInstance.path.split('/');
  const userId = parts[1] || 'global';
  const fileName = parts[2] || 'upload';

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('userId', userId);
  formData.append('destination', 'slide');
  formData.append('fileName', fileName);

  const response = await fetch('/api/signage/publish', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Upload failed');
  }

  const result = await response.json();
  (refInstance as any).downloadUrl = result.url;
  return result;
}

export async function getDownloadURL(refInstance: any) {
  return (refInstance as any).downloadUrl || "";
}

export async function deleteObject(refInstance: any) {
  console.log("Mock delete object from storage:", refInstance.path);
  return Promise.resolve();
}
