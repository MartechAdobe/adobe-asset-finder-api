require("dotenv").config();

const express = require("express");
const cors = require("cors");

const figmaRoutes = require("./routes/figma");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    name: "Adobe Asset Finder API",
    status: "running",
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

// Figma routes
app.use("/figma", figmaRoutes);

app.listen(PORT, () => {
  console.log(`Asset Finder API running on port ${PORT}`);
});