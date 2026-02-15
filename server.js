require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRoute = require("./routes/uploadRoute");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api", uploadRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
