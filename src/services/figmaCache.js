const { getFile } = require("./figma");

const cache = new Map();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes


async function getCachedFile(fileKey) {

  const cached = cache.get(fileKey);

  const now = Date.now();


  /*
   * Return cached file if still valid
   */
  if (
    cached &&
    now - cached.timestamp < CACHE_TTL
  ) {

    return cached.file;

  }


  /*
   * Fetch fresh file from Figma
   */
  const file =
    await getFile(fileKey);


  /*
   * Save to cache
   */
  cache.set(fileKey, {

    file,

    timestamp: now

  });


  return file;

}


/*
 * Clear one file from cache
 */
function clearFileCache(fileKey) {

  cache.delete(fileKey);

}


/*
 * Clear everything
 */
function clearCache() {

  cache.clear();

}


module.exports = {

  getCachedFile,

  clearFileCache,

  clearCache

};