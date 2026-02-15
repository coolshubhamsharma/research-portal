const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-poppler");

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
    const outputDir = path.join(__dirname, "../uploads/images");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
      format: "png",
      out_dir: outputDir,
      out_prefix: "page",
      page: null // convert all pages
    };

    await pdf.convert(filePath, options);

    // Only take first 6 pages to avoid token overload
    const imageFiles = fs.readdirSync(outputDir)
      .filter(file => file.endsWith(".png"))
      .sort()
      .slice(0, 6);

    const base64Images = imageFiles.map(file => {
      const imgPath = path.join(outputDir, file);
      const imgBuffer = fs.readFileSync(imgPath);
      return imgBuffer.toString("base64");
    });

    const result = await analyzeImages(base64Images);

    // Cleanup
    fs.unlinkSync(filePath);
    imageFiles.forEach(file => {
      fs.unlinkSync(path.join(outputDir, file));
    });

    res.json(result);

  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Processing failed." });
  }
});

module.exports = router;
