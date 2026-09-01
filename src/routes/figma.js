const express = require("express");

const router = express.Router();

const {
  getFile,
  getCachedFile,
  getNodeImage,
  getConfiguredFileKeys
} = require("../services/figma");

const {
  searchFigmaNodes
} = require("../services/figmaSearch");


/*
 * ==========================================================
 * FORMAT ASSET RESULT
 * ==========================================================
 */

function formatAssetResult(
  fileKey,
  file,
  result
) {

  return {

    assetId:
      `figma_${fileKey}_${result.nodeId.replace(/:/g, "_")}`,

    source:
      "figma",

    name:
      result.name,

    type:
      result.type,

    fileName:
      file.name,

    fileKey,

    pageName:
      result.pageName || null,

    nodeId:
      result.nodeId,

    matchedText:
      result.matchedText || null,

    description:
      result.description || null,

    score:
      result.score || 0,

    componentProperties:
      result.componentProperties || null,

    previewUrl:
      null,

    figmaUrl:
      `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(
        result.nodeId
      )}`

  };

}


/*
 * ==========================================================
 * GET SINGLE FIGMA FILE
 *
 * GET /figma/file?fileKey=FILE_KEY
 * ==========================================================
 */

router.get("/file", async (req, res) => {

  try {

    const {
      fileKey
    } = req.query;


    if (!fileKey) {

      return res.status(400).json({

        error:
          "fileKey is required"

      });

    }


    const file =
      await getFile(fileKey);


    res.json({

      fileKey,

      name:
        file.name,

      lastModified:
        file.lastModified,

      version:
        file.version,

      thumbnailUrl:
        file.thumbnailUrl

    });


  } catch (error) {

    console.error(
      "Get Figma file error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


/*
 * ==========================================================
 * GET ALL CONFIGURED FIGMA FILES
 *
 * GET /figma/files
 * ==========================================================
 */

router.get("/files", async (req, res) => {

  try {

    const fileKeys =
      getConfiguredFileKeys();


    if (!fileKeys.length) {

      return res.status(500).json({

        error:
          "No Figma files configured. Add FIGMA_FILE_KEYS to .env"

      });

    }


    const files = [];

    const failedFiles = [];


    for (const fileKey of fileKeys) {

      try {

        const file =
          await getCachedFile(fileKey);


        files.push({

          fileKey,

          name:
            file.name,

          lastModified:
            file.lastModified,

          version:
            file.version,

          thumbnailUrl:
            file.thumbnailUrl,

          figmaUrl:
            `https://www.figma.com/design/${fileKey}`

        });


      } catch (error) {

        console.error(

          `Failed to load Figma file ${fileKey}:`,
          error.message

        );


        failedFiles.push({

          fileKey,

          error:
            error.message

        });

      }

    }


    res.json({

      count:
        files.length,

      files,

      failedFiles

    });


  } catch (error) {

    console.error(
      "Get all Figma files error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


/*
 * ==========================================================
 * SEARCH ONE FIGMA FILE
 *
 * GET /figma/search?fileKey=KEY&q=button
 * ==========================================================
 */

router.get("/search", async (req, res) => {

  try {

    const {
      fileKey,
      q,
      preview = "true",
      limit = "10"
    } = req.query;


    if (!fileKey) {

      return res.status(400).json({

        error:
          "fileKey is required"

      });

    }


    if (!q || !q.trim()) {

      return res.status(400).json({

        error:
          "q is required"

      });

    }


    const resultLimit =
      Math.min(
        Math.max(
          parseInt(limit, 10) || 10,
          1
        ),
        50
      );


    const file =
      await getCachedFile(fileKey);


    const results =
      searchFigmaNodes(
        file.document,
        q.trim()
      );


    const limitedResults =
      results.slice(
        0,
        resultLimit
      );


    const resultsWithPreview = [];


    for (
      const result
      of limitedResults
    ) {

      const asset =
        formatAssetResult(
          fileKey,
          file,
          result
        );


      /*
       * Generate preview.
       */

      if (
        preview === "true"
      ) {

        try {

          const image =
            await getNodeImage(
              fileKey,
              result.nodeId
            );


          asset.previewUrl =
            image.images?.[
              result.nodeId
            ] || null;


        } catch (previewError) {

          console.error(

            `Preview failed for ${fileKey}:${result.nodeId}`,

            previewError.message

          );

        }

      }


      resultsWithPreview.push(
        asset
      );

    }


    res.json({

      query:
        q.trim(),

      file: {

        name:
          file.name,

        fileKey

      },

      count:
        results.length,

      returnedResults:
        resultsWithPreview.length,

      results:
        resultsWithPreview

    });


  } catch (error) {

    console.error(
      "Figma search error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


/*
 * ==========================================================
 * SEARCH ALL FIGMA FILES
 *
 * GET /figma/search-all?q=button
 *
 * Optional:
 *
 * ?q=button&limit=10
 * ?q=button&preview=false
 * ?q=button&type=COMPONENT
 * ?q=button&fileKey=FILE_KEY
 * ?q=button&pageName=Page%201
 * ==========================================================
 */

router.get("/search-all", async (req, res) => {

  try {

    const {
      q,
      preview = "true",
      limit = "10",
      fileKey,
      type,
      pageName
    } = req.query;


    /*
     * ========================================================
     * VALIDATE QUERY
     * ========================================================
     */

    if (!q || !q.trim()) {

      return res.status(400).json({

        error:
          "q is required"

      });

    }


    /*
     * ========================================================
     * RESULT LIMIT
     * ========================================================
     */

    const resultLimit =
      Math.min(
        Math.max(
          parseInt(limit, 10) || 10,
          1
        ),
        50
      );


    /*
     * ========================================================
     * GET CONFIGURED FILES
     * ========================================================
     */

    const fileKeys =
      getConfiguredFileKeys();


    if (!fileKeys.length) {

      return res.status(500).json({

        error:
          "No Figma files configured. Add FIGMA_FILE_KEYS to .env"

      });

    }


    /*
     * ========================================================
     * OPTIONAL FILE FILTER
     * ========================================================
     */

    let filesToSearch =
      fileKeys;


    if (fileKey) {

      filesToSearch =
        fileKeys.filter(
          key =>
            key === fileKey
        );

    }


    if (!filesToSearch.length) {

      return res.status(404).json({

        error:
          "Requested fileKey is not configured"

      });

    }


    const allResults = [];

    const searchedFiles = [];

    const failedFiles = [];


    /*
     * ========================================================
     * SEARCH EVERY FILE
     * ========================================================
     */

    for (
      const currentFileKey
      of filesToSearch
    ) {

      try {

        /*
         * Use cache to avoid repeatedly
         * downloading the entire Figma file.
         */

        const file =
          await getCachedFile(
            currentFileKey
          );


        searchedFiles.push({

          fileKey:
            currentFileKey,

          name:
            file.name

        });


        /*
         * Search document tree.
         */

        const results =
          searchFigmaNodes(
            file.document,
            q.trim()
          );


        /*
         * ====================================================
         * APPLY TYPE FILTER
         * ====================================================
         */

        let filteredResults =
          results;


        if (type) {

          filteredResults =
            filteredResults.filter(
              result =>

                result.type?.toLowerCase() ===
                type.toLowerCase()

            );

        }


        /*
         * ====================================================
         * APPLY PAGE FILTER
         * ====================================================
         */

        if (pageName) {

          filteredResults =
            filteredResults.filter(
              result =>

                result.pageName?.toLowerCase() ===
                pageName.toLowerCase()

            );

        }


        /*
         * Keep top 20 results
         * from each file.
         */

        const limitedResults =
          filteredResults.slice(
            0,
            20
          );


        /*
         * Add results to global list.
         */

        for (
          const result
          of limitedResults
        ) {

          allResults.push({

            ...formatAssetResult(
              currentFileKey,
              file,
              result
            ),

            /*
             * Internal file reference.
             * Removed before response.
             */

            _file:
              file

          });

        }


      } catch (fileError) {

        console.error(

          `Failed searching Figma file ${currentFileKey}:`,

          fileError.message

        );


        /*
         * Continue searching other files.
         */

        failedFiles.push({

          fileKey:
            currentFileKey,

          error:
            fileError.message

        });

      }

    }


    /*
     * ==========================================================
     * GLOBAL SORT
     * ==========================================================
     */

    allResults.sort(

      (a, b) =>
        (b.score || 0) -
        (a.score || 0)

    );


    /*
     * ==========================================================
     * REMOVE DUPLICATE NODE IDs
     * ==========================================================
     */

    const uniqueResults = [];

    const seenAssets =
      new Set();


    for (
      const result
      of allResults
    ) {

      const assetKey =
        `${result.fileKey}:${result.nodeId}`;


      if (
        seenAssets.has(
          assetKey
        )
      ) {

        continue;

      }


      seenAssets.add(
        assetKey
      );


      uniqueResults.push(
        result
      );

    }


    /*
     * ==========================================================
     * FINAL RESULT LIMIT
     * ==========================================================
     */

    const finalResults =
      uniqueResults.slice(
        0,
        resultLimit
      );


    /*
     * ==========================================================
     * GENERATE PREVIEWS
     * ==========================================================
     */

    let previewsGenerated = 0;


    if (
      preview === "true"
    ) {

      for (
        const result
        of finalResults
      ) {

        try {

          const image =
            await getNodeImage(

              result.fileKey,

              result.nodeId

            );


          result.previewUrl =
            image.images?.[
              result.nodeId
            ] || null;


          if (
            result.previewUrl
          ) {

            previewsGenerated++;

          }


        } catch (previewError) {

          console.error(

            `Preview failed for ${result.fileKey}:${result.nodeId}`,

            previewError.message

          );


          result.previewUrl =
            null;

        }

      }

    }


    /*
     * ==========================================================
     * REMOVE INTERNAL DATA
     * ==========================================================
     */

    const cleanResults =
      finalResults.map(
        ({
          _file,
          ...result
        }) => result
      );


    /*
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */

    res.json({

      query:
        q.trim(),

      searchedFiles:
        searchedFiles.length,

      totalMatches:
        allResults.length,

      uniqueMatches:
        uniqueResults.length,

      returnedResults:
        cleanResults.length,

      resultLimit,

      filters: {

        fileKey:
          fileKey || null,

        type:
          type || null,

        pageName:
          pageName || null

      },

      previewsRequested:
        preview === "true",

      previewsGenerated,

      results:
        cleanResults,

      files:
        searchedFiles,

      failedFiles

    });


  } catch (error) {

    console.error(
      "Figma search-all error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


/*
 * ==========================================================
 * GET SINGLE FIGMA ASSET
 *
 * GET /figma/asset?fileKey=KEY&nodeId=10:7612
 * ==========================================================
 */

router.get("/asset", async (req, res) => {

  try {

    const {
      fileKey,
      nodeId
    } = req.query;


    if (!fileKey || !nodeId) {

      return res.status(400).json({

        error:
          "fileKey and nodeId are required"

      });

    }


    /*
     * Get cached Figma document.
     */

    const file =
      await getCachedFile(
        fileKey
      );


    let foundNode =
      null;


    /*
     * ========================================================
     * FIND NODE
     * ========================================================
     */

    function findNode(node) {

      if (!node) {
        return;
      }


      if (
        node.id === nodeId
      ) {

        foundNode =
          node;

        return;

      }


      if (
        Array.isArray(
          node.children
        )
      ) {

        for (
          const child
          of node.children
        ) {

          if (
            foundNode
          ) {

            return;

          }


          findNode(
            child
          );

        }

      }

    }


    findNode(
      file.document
    );


    /*
     * ========================================================
     * NODE NOT FOUND
     * ========================================================
     */

    if (!foundNode) {

      return res.status(404).json({

        error:
          "Figma node not found",

        fileKey,

        nodeId

      });

    }


    /*
     * ========================================================
     * PREVIEW
     * ========================================================
     */

    let previewUrl =
      null;


    try {

      const image =
        await getNodeImage(
          fileKey,
          nodeId
        );


      previewUrl =
        image.images?.[
          nodeId
        ] || null;


    } catch (previewError) {

      console.error(

        "Asset preview failed:",

        previewError.message

      );

    }


    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    res.json({

      assetId:
        `figma_${fileKey}_${nodeId.replace(/:/g, "_")}`,

      source:
        "figma",

      file: {

        fileKey,

        name:
          file.name

      },

      asset: {

        nodeId,

        name:
          foundNode.name,

        type:
          foundNode.type,

        description:
          foundNode.description || null,

        componentProperties:
          foundNode.componentPropertyDefinitions || null,

        previewUrl,

        figmaUrl:
          `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(
            nodeId
          )}`

      }

    });


  } catch (error) {

    console.error(
      "Figma asset error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


/*
 * ==========================================================
 * GET FIGMA NODE PREVIEW
 *
 * GET /figma/preview?fileKey=KEY&nodeId=10:7612
 * ==========================================================
 */

router.get("/preview", async (req, res) => {

  try {

    const {
      fileKey,
      nodeId
    } = req.query;


    if (!fileKey || !nodeId) {

      return res.status(400).json({

        error:
          "fileKey and nodeId are required"

      });

    }


    const result =
      await getNodeImage(
        fileKey,
        nodeId
      );


    res.json({

      fileKey,

      nodeId,

      previewUrl:
        result.images?.[
          nodeId
        ] || null,

      figmaUrl:
        `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(
          nodeId
        )}`

    });


  } catch (error) {

    console.error(
      "Figma preview error:",
      error
    );


    res.status(500).json({

      error:
        error.message

    });

  }

});


module.exports = router;