const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { pdfToPng } = require("pdf-to-png-converter");

const { analyzeImages } = require("../services/analysisService");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post("/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = path.resolve(req.file.path);
    const fileBuffer = fs.readFileSync(filePath);

    let base64Images = [];

    // -----------------------------
    // 1️⃣ Try direct text extraction (fast path)
    // -----------------------------
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData.text && pdfData.text.length > 1000) {
        console.log("Using direct text extraction.");
        const result = await analyzeImages([], pdfData.text);
        fs.unlinkSync(filePath);
        return res.json(result);
      }
    } catch (err) {
      console.log("Direct text extraction failed.");
    }

    // -----------------------------
    // 2️⃣ Fallback → Convert first 3 pages to PNG
    // -----------------------------
    console.log("Using Vision fallback...");

    const pngPages = await pdfToPng(fileBuffer, {
      pagesToProcess: [1, 2, 3, 4, 5, 6],
      viewportScale: 2
    });

    base64Images = pngPages.map(page =>
      page.content.toString("base64")
    );

    const result = await analyzeImages(base64Images);

    fs.unlinkSync(filePath);

    res.json(result);

  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Processing failed." });
  }
});

module.exports = router;
