const axios = require("axios");

const FIGMA_TOKEN =
  process.env.FIGMA_TOKEN;

const FIGMA_API =
  "https://api.figma.com/v1";


/*
 * ==========================================================
 * FILE CACHE
 * ==========================================================
 *
 * Figma files can be very large.
 *
 * Instead of requesting the complete file from Figma
 * every time someone searches, keep it temporarily
 * in memory.
 *
 * Cache duration:
 * 5 minutes
 *
 * This can be changed later.
 */

const FILE_CACHE_TTL =
  5 * 60 * 1000;

const fileCache =
  new Map();


/*
 * ==========================================================
 * FIGMA REQUEST
 * ==========================================================
 */

async function figmaRequest(
  url,
  options = {}
) {

  if (!FIGMA_TOKEN) {

    throw new Error(
      "FIGMA_TOKEN is not configured"
    );

  }


  try {

    const response =
      await axios({

        url,

        method:
          options.method || "GET",

        params:
          options.params,

        headers: {

          "X-Figma-Token":
            FIGMA_TOKEN,

          "Content-Type":
            "application/json"

        }

      });


    return response.data;


  } catch (error) {

    const status =
      error.response?.status;

    const data =
      error.response?.data;


    /*
     * Rate limit
     */

    if (status === 429) {

      throw new Error(
        "Figma API rate limit exceeded. Please retry shortly."
      );

    }


    /*
     * Authentication / permissions
     */

    if (status === 403) {

      throw new Error(

        `Figma authentication/permission error: ${
          data?.err || "Forbidden"
        }`

      );

    }


    /*
     * File not found
     */

    if (status === 404) {

      throw new Error(
        "Figma file or node not found"
      );

    }


    /*
     * Other errors
     */

    throw new Error(

      `Figma API error ${status || ""}: ${
        data?.err ||
        error.message
      }`

    );

  }

}


/*
 * ==========================================================
 * GET FIGMA FILE
 * ==========================================================
 *
 * Downloads the complete Figma document.
 *
 * GET /v1/files/:fileKey
 */

async function getFile(
  fileKey
) {

  if (!fileKey) {

    throw new Error(
      "fileKey is required"
    );

  }


  return await figmaRequest(

    `${FIGMA_API}/files/${fileKey}`

  );

}


/*
 * ==========================================================
 * GET CACHED FIGMA FILE
 * ==========================================================
 *
 * Used by search-all.
 *
 * This prevents repeatedly calling:
 *
 * GET /v1/files/:fileKey
 *
 * for every search request.
 */

async function getCachedFile(
  fileKey
) {

  if (!fileKey) {

    throw new Error(
      "fileKey is required"
    );

  }


  const cached =
    fileCache.get(fileKey);


  /*
   * Check whether cached file
   * is still valid.
   */

  if (cached) {

    const age =
      Date.now() -
      cached.timestamp;


    if (
      age < FILE_CACHE_TTL
    ) {

      console.log(
        `Using cached Figma file: ${fileKey}`
      );


      return cached.data;

    }


    /*
     * Cache expired.
     */

    fileCache.delete(
      fileKey
    );

  }


  /*
   * Fetch fresh file.
   */

  console.log(
    `Fetching Figma file: ${fileKey}`
  );


  const file =
    await getFile(
      fileKey
    );


  /*
   * Store in cache.
   */

  fileCache.set(

    fileKey,

    {

      data:
        file,

      timestamp:
        Date.now()

    }

  );


  return file;

}


/*
 * ==========================================================
 * CLEAR CACHE
 * ==========================================================
 *
 * Useful when you know a Figma file was updated.
 */

function clearFileCache(
  fileKey
) {

  if (fileKey) {

    fileCache.delete(
      fileKey
    );

    return;

  }


  /*
   * Clear everything.
   */

  fileCache.clear();

}


/*
 * ==========================================================
 * GET RENDERED NODE IMAGE
 * ==========================================================
 *
 * Generates a PNG preview for a specific node.
 *
 * GET /v1/images/:fileKey
 */

async function getNodeImage(
  fileKey,
  nodeId
) {

  if (!fileKey) {

    throw new Error(
      "fileKey is required"
    );

  }


  if (!nodeId) {

    throw new Error(
      "nodeId is required"
    );

  }


  return await figmaRequest(

    `${FIGMA_API}/images/${fileKey}`,

    {

      params: {

        ids:
          nodeId,

        format:
          "png",

        scale:
          1

      }

    }

  );

}


/*
 * ==========================================================
 * GET CONFIGURED FILE KEYS
 * ==========================================================
 *
 * Reads:
 *
 * FIGMA_FILE_KEYS=file1,file2,file3
 *
 * from .env
 *
 * These are currently your Draft files.
 */

function getConfiguredFileKeys() {

  const value =
    process.env.FIGMA_FILE_KEYS || "";


  return value

    .split(",")

    .map(
      key =>
        key.trim()
    )

    .filter(
      Boolean
    );

}


/*
 * ==========================================================
 * EXPORTS
 * ==========================================================
 */

module.exports = {

  getFile,

  getCachedFile,

  getNodeImage,

  getConfiguredFileKeys,

  clearFileCache

};