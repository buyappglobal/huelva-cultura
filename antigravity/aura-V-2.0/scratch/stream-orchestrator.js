/**
 * Standalone Node.js HLS Streaming Orchestrator for Aura TV
 * 
 * Requirements on Linux Server (VPS):
 * 1. install Chrome/Puppeteer dependencies: `sudo apt install -y chromium-browser xvfb pulseaudio ffmpeg`
 * 2. install Node packages: `npm install puppeteer dotenv @aws-sdk/client-s3`
 * 
 * Execution:
 *   xvfb-run --server-args="-screen 0 1920x1080x24" node stream-orchestrator.js
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
const TV_URL = process.env.AURA_TV_URL || 'http://localhost:5173/tv/demo?stream=true';
const OUTPUT_DIR = process.env.STREAM_OUTPUT_DIR || path.join(__dirname, 'hls_stream');
const STREAM_KEY = process.env.STREAM_KEY || 'aura_live';
const R2_ENABLED = process.env.R2_UPLOAD_ENABLED === 'true';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// AWS S3 client for Cloudflare R2 upload
let s3Client = null;
if (R2_ENABLED) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
  console.log(`[Orchestrator] Launching Chromium pointing to: ${TV_URL}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Must be false when running under xvfb-run to render GPU Canvas correctly
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--window-size=1920,1080',
      '--kiosk', // Fullscreen mode
    ],
  });

  const page = await browser.newPage();
  await page.goto(TV_URL, { waitUntil: 'networkidle2' });
  console.log('[Orchestrator] Aura Playout Loaded.');

  // Wait a few seconds for visualizers to boot up
  await new Promise(r => setTimeout(r, 5000));

  console.log('[Orchestrator] Starting FFmpeg process...');

  // Linux virtual display capture commands:
  // Grabs virtual desktop screen ':99' (set by xvfb-run) and virtual soundcard
  const ffmpegArgs = [
    '-f', 'x11grab',
    '-video_size', '1920x1080',
    '-framerate', '30',
    '-i', process.env.DISPLAY || ':99',
    '-f', 'pulse',
    '-i', 'default',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds at 30fps
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'hls',
    '-hls_time', '2', // 2-second segments
    '-hls_list_size', '5', // Keep last 5 segments in the playlist
    '-hls_flags', 'delete_segments', // Automatically delete old segments
    '-hls_segment_filename', path.join(OUTPUT_DIR, 'segment_%03d.ts'),
    path.join(OUTPUT_DIR, 'playlist.m3u8')
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    // FFmpeg logs to stderr by default
    const line = data.toString();
    if (line.includes('frame=')) {
      console.log(`[FFmpeg] ${line.trim()}`);
    }
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[Orchestrator] FFmpeg exited with code ${code}`);
  });

  // Watch the HLS directory for modifications and upload new files to R2 bucket
  if (R2_ENABLED) {
    console.log('[Orchestrator] R2 Live Uploader Active. Watching output directory...');
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
    console.log('\n[Orchestrator] Shutting down...');
    ffmpegProcess.kill('SIGINT');
    await browser.close();
    process.exit(0);
  });
}

startOrchestrator().catch(console.error);
