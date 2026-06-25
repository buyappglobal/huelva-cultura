import sqlite3 from "sqlite3";
import path from "path";
import crypto from "crypto";

const dbPath = path.join(process.cwd(), "aura.db");
let db: sqlite3.Database;

// Simple SHA-256 password hashing helper
export function hashPassword(password: string): string {
  const salt = "aura_display_salt_2026";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Failed to open SQLite database:", err);
        return reject(err);
      }
      console.log(`SQLite database opened successfully at ${dbPath}`);
      createTables().then(resolve).catch(reject);
    });
  });
}

function createTables(): Promise<void> {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      hasAdsPanel INTEGER DEFAULT 0,
      hasImpulses INTEGER DEFAULT 0,
      isDemoAccount INTEGER DEFAULT 0,
      whatsapp TEXT,
      city TEXT,
      slug TEXT UNIQUE,
      status TEXT DEFAULT 'trial',
      trialEndsAt INTEGER,
      otpCode TEXT,
      otpExpiresAt INTEGER,
      createdAt INTEGER NOT NULL
    );
  `;

  const displaysTable = `
    CREATE TABLE IF NOT EXISTS displays (
      id TEXT PRIMARY KEY,
      establishmentName TEXT,
      adminTitle TEXT,
      location TEXT,
      theme TEXT DEFAULT 'classic',
      volume REAL DEFAULT 0.7,
      isZenMode INTEGER DEFAULT 0,
      isNoDistractionsMode INTEGER DEFAULT 0,
      isRemoteControl INTEGER DEFAULT 0,
      performanceMode TEXT DEFAULT 'high',
      signageUrl TEXT,
      signageType TEXT,
      compiledManifest TEXT,
      visualStyle TEXT DEFAULT 'standard',
      vjConfig TEXT,
      promoFlashText TEXT,
      promoFlashExpiresAt INTEGER,
      updatedAt INTEGER
    );
  `;

  const contentsTable = `
    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      storagePath TEXT,
      schedule TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const quotesTable = `
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      category TEXT,
      text TEXT NOT NULL,
      price TEXT,
      tag TEXT,
      imageUrl TEXT,
      showClock INTEGER DEFAULT 0,
      schedule TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const pairingCodesTable = `
    CREATE TABLE IF NOT EXISTS pairingCodes (
      code TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      linkedClientId TEXT,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `;

  return Promise.all([
    dbRun(usersTable),
    dbRun(displaysTable),
    dbRun(contentsTable),
    dbRun(quotesTable),
    dbRun(pairingCodesTable),
  ]).then(async () => {
    console.log("Database tables verified/created.");
    try {
      await dbRun("ALTER TABLE users ADD COLUMN isDemoAccount INTEGER DEFAULT 0");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN whatsapp TEXT");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'trial'");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN trialEndsAt INTEGER");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN otpCode TEXT");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE users ADD COLUMN otpExpiresAt INTEGER");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE displays ADD COLUMN visualStyle TEXT DEFAULT 'standard'");
    } catch (e) {}
    try {
      await dbRun("ALTER TABLE displays ADD COLUMN vjConfig TEXT");
    } catch (e) {}
    // Create a default superadmin if no users exist
    try {
      const existingUser = await dbGet("SELECT id FROM users WHERE email = 'holasolonet@gmail.com'");
      if (!existingUser) {
        const superadminId = "superadmin_default";
        const email = "holasolonet@gmail.com";
        const passHash = hashPassword("aura2026");
        await dbRun(
          `INSERT INTO users (id, email, passwordHash, role, slug, createdAt) 
           VALUES (?, ?, ?, 'superadmin', 'superadmin', ?)`,
          [superadminId, email, passHash, Date.now()]
        );
        console.log("Default Super Admin user (holasolonet@gmail.com) created. Pass: aura2026");
      }
    } catch (e) {
      console.error("Error creating default superadmin:", e);
    }

    // Create a dedicated live retransmission superadmin user
    try {
      const existingLiveAdmin = await dbGet("SELECT id FROM users WHERE email = 'pruebacloud@auradisplay.es'");
      if (!existingLiveAdmin) {
        const liveAdminId = "directo_stream_id";
        const email = "pruebacloud@auradisplay.es";
        const passHash = hashPassword("aura2026");
        await dbRun(
          `INSERT INTO users (id, email, passwordHash, role, slug, createdAt) 
           VALUES (?, ?, ?, 'superadmin', 'directo', ?)`,
          [liveAdminId, email, passHash, Date.now()]
        );
        console.log("Dedicated live stream superadmin (pruebacloud@auradisplay.es) created. Pass: aura2026");
      }
    } catch (e) {
      console.error("Error creating live stream superadmin:", e);
    }

    // Create default visualizer creator if it doesn't exist
    try {
      const existingCreator = await dbGet("SELECT id FROM users WHERE email = 'cinside.info@gmail.com'");
      if (!existingCreator) {
        const creatorId = "visualizer_creator_default";
        const email = "cinside.info@gmail.com";
        const passHash = hashPassword("aura2026");
        await dbRun(
          `INSERT INTO users (id, email, passwordHash, role, slug, createdAt) 
           VALUES (?, ?, ?, 'client', 'cinside', ?)`,
          [creatorId, email, passHash, Date.now()]
        );
        console.log("Default Visualizer Creator user (cinside.info@gmail.com) created. Pass: aura2026");
      }
    } catch (e) {
      console.error("Error creating default visualizer creator:", e);
    }
  });
}

// Promisified DB execution helpers
export function dbRun(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error(`DB Run Error: ${sql}`, err);
        return reject(err);
      }
      resolve();
    });
  });
}

export function dbGet(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error(`DB Get Error: ${sql}`, err);
        return reject(err);
      }
      resolve(row);
    });
  });
}

export function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(`DB All Error: ${sql}`, err);
        return reject(err);
      }
      resolve(rows);
    });
  });
}
