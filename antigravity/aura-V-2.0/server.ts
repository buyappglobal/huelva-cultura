import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// S3 Client configured for Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const upload = multer({ storage: multer.memoryStorage() });
const R2_BASE = "https://media.auradisplay.es/";

// Visualizer loop baking endpoint (WebM to MP4 via local FFmpeg)
app.post("/api/admin/bake-visualizer-video", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { name } = req.body;
    if (!file) {
      return res.status(400).json({ error: "No visualizer file received." });
    }
    if (!name) {
      return res.status(400).json({ error: "No visualizer name received." });
    }

    const fs = require("fs");
    const path = require("path");
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const os = require("os");
    const execPromise = promisify(exec);

    const tempId = Date.now();
    const tempInputPath = path.join(os.tmpdir(), `input_${tempId}.webm`);
    const tempOutputPath = path.join(os.tmpdir(), `output_${tempId}.mp4`);

    fs.writeFileSync(tempInputPath, file.buffer);

    console.log(`[Visualizer Bake] Transcoding WebM to MP4 for visualizer: ${name}...`);
    await execPromise(`ffmpeg -y -i "${tempInputPath}" -c:v libx264 -pix_fmt yuv420p -an "${tempOutputPath}"`);

    const mp4Buffer = fs.readFileSync(tempOutputPath);
    const storagePath = `visualizers/${name.toLowerCase().trim()}.mp4`;
    const bucketName = process.env.R2_BUCKET_NAME || "aura-media";

    console.log(`[Visualizer Bake] Uploading MP4 loop (${mp4Buffer.length} bytes) to R2 bucket [${bucketName}], path: ${storagePath}`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: mp4Buffer,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    });
    await r2Client.send(command);

    try {
      fs.unlinkSync(tempInputPath);
      fs.unlinkSync(tempOutputPath);
    } catch (e) {
      console.warn("[Visualizer Bake Cleanup Warning]:", e);
    }

    const publicUrl = `${R2_BASE}${storagePath}`;
    res.json({
      success: true,
      url: publicUrl,
      storagePath: storagePath
    });
  } catch (error: any) {
    console.error("[Visualizer Bake Error]:", error);
    res.status(500).json({ error: "Failed to bake visualizer MP4 loop", details: error.message });
  }
});

// Serve static frontend build
app.use(express.static(path.join(process.cwd(), "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`[Developer Baker Utility] Running at http://localhost:${port}`);
  console.log(`[Developer Baker Utility] Ready to record visualizers and convert via FFmpeg.`);
});
