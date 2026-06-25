import * as admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
try {
  admin.initializeApp({ projectId: "gen-lang-client-0720259025" });
  console.log("initialized!");
  const db = getAdminFirestore(admin.app(), "ai-studio-00773333-2aa4-40c3-a9fb-58a2d5c43afc");
  console.log("db got!");
} catch (e) {
  console.error("error:", e);
}
