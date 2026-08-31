const FIGMA_API_URL = "https://api.figma.com/v1";

// Simple in-memory cache
const fileCache = new Map();

// Cache files for 30 minutes
const CACHE_DURATION = 30 * 60 * 1000;


async function figmaRequest(endpoint) {

  const response = await fetch(
    `${FIGMA_API_URL}${endpoint}`,
    {
      method: "GET",

      headers: {
        "X-Figma-Token": process.env.FIGMA_TOKEN
      }
    }
  );

  if (!response.ok) {

    const errorText = await response.text();

    throw new Error(
      `Figma API error ${response.status}: ${errorText}`
    );
  }

  return await response.json();
}


async function getFile(fileKey) {

  // Check cache
  const cached = fileCache.get(fileKey);

  if (cached) {

    const age =
      Date.now() - cached.timestamp;

    if (age < CACHE_DURATION) {

      console.log(
        `Using cached Figma file: ${fileKey}`
      );

      return cached.data;
    }

    // Remove expired cache
    fileCache.delete(fileKey);
  }


  console.log(
    `Fetching Figma file from API: ${fileKey}`
  );


  const data = await figmaRequest(
    `/files/${fileKey}`
  );


  // Store in cache
  fileCache.set(fileKey, {

    data,

    timestamp: Date.now()

  });


  return data;
}


async function getNodeImage(
  fileKey,
  nodeId
) {

  const encodedNodeId =
    encodeURIComponent(nodeId);


  return await figmaRequest(
    `/images/${fileKey}?ids=${encodedNodeId}&format=png`
  );
}


function clearFileCache(fileKey) {

  if (fileKey) {

    fileCache.delete(fileKey);

  } else {

    fileCache.clear();

  }

}


module.exports = {

  getFile,

  getNodeImage,

  clearFileCache

};