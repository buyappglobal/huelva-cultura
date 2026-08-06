const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Configuration from environment variables or args
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.argv[2];
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.argv[3];
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || process.argv[4] || '21m00Tcm4TlvDq8ikWAM'; // Default voice if none specified

if (!GEMINI_API_KEY || !ELEVENLABS_API_KEY) {
  console.log(`
❌ Error: Faltan credenciales API.

Uso:
  node generate_bulletin_ai.cjs <GEMINI_API_KEY> <ELEVENLABS_API_KEY> [ELEVENLABS_VOICE_ID]

O configura un archivo .env con:
  GEMINI_API_KEY=tu_gemini_key
  ELEVENLABS_API_KEY=tu_elevenlabs_key
  ELEVENLABS_VOICE_ID=tu_voice_id
`);
  process.exit(1);
}

async function generateBulletinText() {
  console.log('📡 1. Buscando noticias y redactando guión con Gemini API + Google Search...');
  
  const promptText = `
Eres el redactor jefe y locutor de noticias de Aura Radio (Huelva). 
Busca las noticias más destacadas de HOY en la provincia de Huelva y redacta un boletín informativo de radio directo, fresco y profesional.

Estructura obligatoria del boletín (duración estimada: 90 segundos, unas 200-240 palabras):
1. Saludo breve: "Noticias en Aura Radio. Saludos de la redacción informativa..."
2. Noticia de la Sierra de Huelva: Actualidad reciente de la Sierra de Aracena y Picos de Aroche / Jabugo.
3. Noticia Provincial: Noticia destacada de la provincia o capital onubense.
4. Noticia Deportiva: Actualidad del Recreativo de Huelva o deporte local.
5. El Tiempo: Pronóstico del tiempo para el día de hoy en Huelva.
6. Cierre: "Toda la información al minuto en Aura Radio. Seguimos con más música."

REGLAS CRÍTICAS:
- No incluyas anotaciones de producción entre corchetes o paréntesis como [Música de fondo] o (Pausa).
- Escribe ÚNICAMENTE el texto directo listo para ser locutado por voz artificial de alta calidad.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    tools: [
      {
        google_search: {}
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Gemini API (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini no devolvió texto válido.');
  }

  // Clean text from Markdown tags if any
  const cleanedText = text
    .replace(/[\*\_]/g, '')
    .replace(/^#+\s+/gm, '')
    .trim();

  console.log('\n📝 Guión redactado por Gemini:\n----------------------------------------');
  console.log(cleanedText);
  console.log('----------------------------------------\n');

  return cleanedText;
}

async function synthesizeVoiceWithElevenLabs(bulletinText) {
  console.log(`🎙️ 2. Generando voz con ElevenLabs (Voice ID: ${ELEVENLABS_VOICE_ID})...`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: bulletinText,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.85
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en ElevenLabs API (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputDir = path.join(__dirname, 'boletines');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'boletin_latest.mp3');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Audio de boletín generado con éxito (${buffer.length} bytes) en: ${outputPath}`);

  return outputPath;
}

function uploadToCloudflareR2(mp3Path) {
  console.log('☁️ 3. Subiendo boletín a Cloudflare R2 (aura-boletines)...');
  try {
    const cmd = `npx wrangler r2 object put aura-boletines/boletines/boletin_latest.mp3 --file "${mp3Path}" --remote`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('🎉 ¡Boletín subido a producción correctamente! Disponible en: https://boletines.auraradio.es/boletines/boletin_latest.mp3');
  } catch (e) {
    console.warn('⚠️ No se pudo subir automáticamente a R2 mediante wrangler. Asegúrate de tener permisos o wrangler configurado.', e.message);
  }
}

(async () => {
  try {
    const bulletinText = await generateBulletinText();
    const mp3Path = await synthesizeVoiceWithElevenLabs(bulletinText);
    uploadToCloudflareR2(mp3Path);
    console.log('\n🚀 PROCESO COMPLETADO: El boletín de Aura Radio ha sido actualizado automáticamente.');
  } catch (err) {
    console.error('❌ Error en el proceso de generación:', err.message);
    process.exit(1);
  }
})();
