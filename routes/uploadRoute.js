const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { pdfToPng } = require("pdf-to-png-converter");
const Tesseract = require("tesseract.js");

const { analyzeTranscriptText } = require("../services/analysisService");

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

    // Convert first 6 pages to PNG buffers
    const pngPages = await pdfToPng(fileBuffer, {
      pagesToProcess: [1,2,3,4,5,6],
      viewportScale: 2
    });

    let extractedText = "";

    for (const page of pngPages) {
      const imageBuffer = page.content; // PNG buffer

      const {
        data: { text }
      } = await Tesseract.recognize(imageBuffer, "eng");

      extractedText += text + "\n";
    }

    if (!extractedText || extractedText.length < 200) {
      return res.status(400).json({
        error: "OCR extraction failed."
      });
    }

    const result = await analyzeTranscriptText(extractedText);

    fs.unlinkSync(filePath);

    res.json(result);

  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Processing failed." });
  }
});

module.exports = router;
