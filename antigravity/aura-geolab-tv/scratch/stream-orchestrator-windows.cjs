/**
 * Standalone Windows Node.js HLS Streaming Orchestrator for Aura TV
 * 
 * Requirements on Windows:
 * 1. Install FFmpeg and add it to your system PATH (https://ffmpeg.org/download.html)
 * 2. Install Node packages in the workspace: npm install puppeteer dotenv @aws-sdk/client-s3
 * 
 * Execution:
 *   node scratch/stream-orchestrator-windows.js
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
// We use the ID of the user (e.g. 3lxY0IcAPobwLVbssVk3AWo58uk2 or 'demo')
const STREAM_KEY = process.env.STREAM_KEY || '3IxY0lcAPobwLVbssVk3AWo58uk2';
// Point to the local tv playout or production
const TV_URL = process.env.AURA_TV_URL || `http://localhost:5173/tv/${STREAM_KEY}?stream=true`;
const OUTPUT_DIR = process.env.STREAM_OUTPUT_DIR || path.join(__dirname, 'hls_stream');
const R2_ENABLED = process.env.R2_UPLOAD_ENABLED === 'true';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// AWS S3 client for Cloudflare R2 upload
let s3Client = null;
if (R2_ENABLED) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadToR2(filePath, fileName) {
  if (!s3Client) return;
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  try {
    const fileStream = fs.createReadStream(filePath);
    const contentType = fileName.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `live/${STREAM_KEY}/${fileName}`,
      Body: fileStream,
      ContentType: contentType,
      CacheControl: fileName.endsWith('.m3u8') ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400',
    }));
    console.log(`[R2] Uploaded ${fileName}`);
  } catch (err) {
    console.error(`[R2] Failed to upload ${fileName}:`, err);
  }
}

async function startOrchestrator() {
  console.log(`[Orchestrator Windows] Launching Chrome pointing to: ${TV_URL}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Must be false to render visualizers and WebGL correctly
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.goto(TV_URL, { waitUntil: 'networkidle2' });
  console.log('[Orchestrator Windows] Aura Playout Loaded. Waiting 5s for boot...');

  // Wait 5 seconds for visualizers to boot up
  await new Promise(r => setTimeout(r, 5000));

  console.log('[Orchestrator Windows] Starting FFmpeg capture process...');

  // Windows Desktop capture command:
  // Grabs desktop screen using gdigrab and system default audio loopback using wasapi
  const ffmpegArgs = [
    '-f', 'gdigrab',
    '-framerate', '30',
    '-video_size', '1920x1080',
    '-i', 'desktop',
    // Uncomment these lines if you want to capture audio via WASAPI Loopback (requires default playback device capture)
    // '-f', 'wasapi',
    // '-i', 'default',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds
    // Audio options:
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    // HLS Segmenting:
    '-f', 'hls',
    '-hls_time', '2', // 2-second segments
    '-hls_list_size', '5', // Keep last 5 segments in the playlist
    '-hls_flags', 'delete_segments', // Automatically delete old segments
    '-hls_segment_filename', path.join(OUTPUT_DIR, 'segment_%03d.ts'),
    path.join(OUTPUT_DIR, 'playlist.m3u8')
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    const line = data.toString();
    if (line.includes('frame=')) {
      console.log(`[FFmpeg] ${line.trim()}`);
    }
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[Orchestrator Windows] FFmpeg exited with code ${code}`);
  });

  // Watch the HLS directory for modifications and upload new files to R2 bucket
  if (R2_ENABLED) {
    console.log('[Orchestrator Windows] R2 Live Uploader Active. Watching output directory...');
    fs.watch(OUTPUT_DIR, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(OUTPUT_DIR, filename);
      
      // Delay slightly to ensure file is fully written by FFmpeg
      setTimeout(() => {
        if (fs.existsSync(fullPath)) {
          uploadToR2(fullPath, filename);
        }
      }, 500);
    });
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Orchestrator Windows] Shutting down...');
    ffmpegProcess.kill('SIGINT');
    await browser.close();
    process.exit(0);
  });
}

startOrchestrator().catch(console.error);
