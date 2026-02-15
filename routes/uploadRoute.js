const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
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

    let extractedText = "";

    // -----------------------------
    // 1 Try direct text extraction
    // -----------------------------
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData.text && pdfData.text.length > 1000) {
        extractedText = pdfData.text;
        console.log("Using direct text extraction.");
      }
    } catch (err) {
      console.log("Direct text extraction failed. Falling back to OCR.");
    }

    // -----------------------------
    // 2 If insufficient text → OCR
    // -----------------------------
    if (!extractedText || extractedText.length < 1000) {
      console.log("Running OCR fallback...");

      const pngPages = await pdfToPng(fileBuffer, {
        pagesToProcess: [1, 2, 3],
        viewportScale: 1.3
      });

      for (const page of pngPages) {
        const imageBuffer = page.content;

        const {
          data: { text }
        } = await Tesseract.recognize(imageBuffer, "eng");

        extractedText += text + "\n";
      }
    }

    if (!extractedText || extractedText.length < 200) {
      return res.status(400).json({
        error: "Unable to extract meaningful text from PDF."
      });
    }

    // -----------------------------
    // 3. Send to LLM
    // -----------------------------
    const result = await analyzeTranscriptText(extractedText);

    fs.unlinkSync(filePath);

    res.json(result);

  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Processing failed." });
  }
});

module.exports = router;
