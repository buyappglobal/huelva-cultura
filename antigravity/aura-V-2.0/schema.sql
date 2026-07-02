-- SQLite Schema for Cloudflare D1 (Aura Display V-2.0)

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
  permissions TEXT,
  createdAt INTEGER NOT NULL
);

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
  textSize REAL DEFAULT 1.0,
  promoFlashText TEXT,
  updatedAt INTEGER,
  textRotationInterval INTEGER DEFAULT 20,
  visualizerRotationInterval INTEGER DEFAULT 18,
  adTextDuration INTEGER DEFAULT 30
);

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

CREATE TABLE IF NOT EXISTS pairingCodes (
  code TEXT PRIMARY KEY,
  deviceId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  linkedClientId TEXT,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

-- Insert default Super Admin (holasolonet@gmail.com / aura2026)
-- Password hash: aura_display_salt_2026 hashed with sha256 of "aura2026"
-- SHA256 Hmac of "aura2026" with salt "aura_display_salt_2026" is:
-- 4f5e7144e054cfdf62b9a7ce1c56f7ef5eb46bc37340c49ce37ceea9e3f9456f
INSERT OR IGNORE INTO users (id, email, passwordHash, role, slug, createdAt)
VALUES ('superadmin_default', 'holasolonet@gmail.com', '4f5e7144e054cfdf62b9a7ce1c56f7ef5eb46bc37340c49ce37ceea9e3f9456f', 'superadmin', 'superadmin', 1774980000000);


CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  displayId TEXT NOT NULL,
  partnerId TEXT,
  text TEXT NOT NULL,
  formatType TEXT NOT NULL,
  schedule TEXT,
  status TEXT DEFAULT 'pending_action',
  resolvedImageUrl TEXT,
  createdAt INTEGER NOT NULL
);

-- Stripe Connect & Partnerships
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'partner', 'dcz', 'aura_central', 'obra_social'
  parentId TEXT, -- Who captured this partner (e.g. DCZ id) for residual commissions
  stripeAccountId TEXT,
  contactEmail TEXT,
  permissions TEXT,
  createdAt INTEGER NOT NULL
);

-- Relates to users/displays to know who gets the cut
CREATE TABLE IF NOT EXISTS client_hierarchy (
  clientId TEXT PRIMARY KEY,
  parentAdminId TEXT, -- Who closed the sale (DCZ, Aura Central, etc.)
  nodePartnerId TEXT, -- Who owns the physical screen (Partner)
  obraSocialId TEXT, -- Active NGO contract at the time of sale
  stripeCustomerId TEXT,
  subscriptionStatus TEXT DEFAULT 'trial',
  FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ad_sales (
  id TEXT PRIMARY KEY,
  displayId TEXT NOT NULL,
  sellerId TEXT NOT NULL, -- DCZ, Partner, or Central
  amount REAL NOT NULL, -- Must be >= 20
  stripePaymentIntentId TEXT,
  status TEXT DEFAULT 'pending',
  createdAt INTEGER NOT NULL
);

-- Advertising Clients (Cross-Advertising CRM)
CREATE TABLE IF NOT EXISTS ad_clients (
  id TEXT PRIMARY KEY,
  fiscalName TEXT,
  taxId TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  establishmentName TEXT,
  motto TEXT,
  bottomText TEXT,
  qrUrl TEXT,
  status TEXT DEFAULT 'pending_creative',
  createdAt INTEGER NOT NULL
);

-- Target Scraper leads (Aura Target Scraper V2 leads)
CREATE TABLE IF NOT EXISTS target_leads (
  id TEXT PRIMARY KEY,
  companyName TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  email TEXT,
  webUrl TEXT,
  latitude REAL,
  longitude REAL,
  province TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending_validation',
  createdAt INTEGER NOT NULL
);