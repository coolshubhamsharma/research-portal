const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("canvas");

const { analyzeImages } = require("../services/analysisService");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 30 * 1024 * 1024 }
});

router.post("/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = path.resolve(req.file.path);
    const fileBuffer = fs.readFileSync(filePath);

    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;

    const maxPages = Math.min(pdf.numPages, 6);
    const base64Images = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const imageBuffer = canvas.toBuffer("image/png");
      base64Images.push(imageBuffer.toString("base64"));
    }

    const result = await analyzeImages(base64Images);

    fs.unlinkSync(filePath);

    res.json(result);

  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Processing failed." });
  }
});

module.exports = router;
