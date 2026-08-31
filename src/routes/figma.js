const express = require("express");

const router = express.Router();

const {
  getFile,
  getNodeImage
} = require("../services/figma");

const {
  searchFigmaNodes
} = require("../services/figmaSearch");


/*
 * GET Figma file
 */
router.get("/file", async (req, res) => {

  try {

    const { fileKey } = req.query;

    if (!fileKey) {
      return res.status(400).json({
        error: "fileKey is required"
      });
    }

    const file = await getFile(fileKey);

    res.json({
      name: file.name,
      lastModified: file.lastModified,
      version: file.version,
      thumbnailUrl: file.thumbnailUrl
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});


/*
 * SEARCH FIGMA
 */
router.get("/search", async (req, res) => {
  try {
    const { fileKey, q } = req.query;

    if (!fileKey) {
      return res.status(400).json({
        error: "fileKey is required"
      });
    }

    if (!q) {
      return res.status(400).json({
        error: "q is required"
      });
    }

    const file = await getFile(fileKey);

    const results = searchFigmaNodes(
      file.document,
      q
    );

    // Limit results to avoid unnecessary Figma image API calls
    const limitedResults = results.slice(0, 10);

    const resultsWithPreview = [];

    for (const result of limitedResults) {
      let previewUrl = null;

      try {
        const preview = await getNodeImage(
          fileKey,
          result.nodeId
        );

        previewUrl =
          preview.images?.[result.nodeId] || null;

      } catch (previewError) {
        console.error(
          `Preview failed for ${result.nodeId}`,
          previewError.message
        );
      }

      resultsWithPreview.push({
        assetId: `figma_${result.nodeId.replace(":", "_")}`,

        source: "figma",

        name: result.name,

        type: result.type,

        pageName: result.pageName,

        nodeId: result.nodeId,

        matchedText: result.matchedText,

        description: result.description,

        previewUrl,

        figmaUrl:
          `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(result.nodeId)}`
      });
    }

    res.json({
      query: q,

      file: {
        name: file.name,
        fileKey
      },

      count: results.length,

      results: resultsWithPreview
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }
});


/*
 * GET FIGMA PREVIEW
 */
router.get("/preview", async (req, res) => {

  try {

    const {
      fileKey,
      nodeId
    } = req.query;

    if (!fileKey || !nodeId) {

      return res.status(400).json({
        error: "fileKey and nodeId are required"
      });

    }

    const result = await getNodeImage(
      fileKey,
      nodeId
    );

    res.json({

      fileKey,

      nodeId,

      previewUrl:
        result.images?.[nodeId] || null

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});


module.exports = router;