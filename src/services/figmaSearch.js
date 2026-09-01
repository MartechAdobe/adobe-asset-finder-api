/*
 * Figma Asset Search
 */

const ASSET_TYPES = new Set([
  "FRAME",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
  "SECTION"
]);


/*
 * Normalize text
 */
function normalize(value) {

  return String(value || "")
    .toLowerCase()
    .trim();

}


/*
 * Convert text into searchable tokens.
 *
 * "ACS Summit Email"
 *
 * becomes:
 *
 * ["acs", "summit", "email"]
 */
function tokenize(value) {

  return normalize(value)
    .split(/\s+/)
    .filter(Boolean);

}


/*
 * Calculate search score.
 */
function calculateScore(
  node,
  query,
  pageName
) {

  const q =
    normalize(query);

  const name =
    normalize(node.name);

  const description =
    normalize(node.description);

  const page =
    normalize(pageName);


  if (!name) {
    return 0;
  }


  /*
   * Exact name
   */
  if (name === q) {
    return 1000;
  }


  /*
   * Name starts with query
   */
  if (name.startsWith(q)) {
    return 800;
  }


  /*
   * Name contains complete query
   */
  if (name.includes(q)) {
    return 650;
  }


  /*
   * Query appears in description
   */
  if (
    description &&
    description.includes(q)
  ) {

    return 500;

  }


  /*
   * Query appears in page name
   */
  if (
    page &&
    page.includes(q)
  ) {

    return 300;

  }


  /*
   * Partial token matching
   */
  const queryTokens =
    tokenize(q);

  const searchableText =
    `${name} ${description} ${page}`;


  let matchedTokens = 0;


  for (const token of queryTokens) {

    if (
      searchableText.includes(token)
    ) {

      matchedTokens++;

    }

  }


  if (matchedTokens > 0) {

    return (
      200 +
      matchedTokens * 50
    );

  }


  return 0;

}


/*
 * Extract useful component information.
 */
function extractComponentProperties(
  node
) {

  if (
    !node.componentPropertyDefinitions
  ) {

    return null;

  }


  return Object.entries(
    node.componentPropertyDefinitions
  ).map(
    ([name, property]) => ({

      name,

      type:
        property.type || null,

      defaultValue:
        property.defaultValue ?? null

    })
  );

}


/*
 * Search Figma document.
 */
function searchFigmaNodes(
  document,
  query
) {

  const results = [];

  const q =
    normalize(query);


  if (
    !document ||
    !q
  ) {

    return results;

  }


  function walk(
    node,
    pageName = null,
    parent = null
  ) {

    if (!node) {
      return;
    }


    /*
     * Track page.
     */
    if (
      node.type === "CANVAS"
    ) {

      pageName =
        node.name;

    }


    /*
     * Search asset-level nodes.
     */
    if (
      ASSET_TYPES.has(node.type)
    ) {

      const score =
        calculateScore(
          node,
          q,
          pageName
        );


      if (score > 0) {

        results.push({

          nodeId:
            node.id,

          name:
            node.name,

          type:
            node.type,

          pageName,

          matchedText:
            node.name,

          description:
            node.description || null,

          score,

          parentId:
            parent?.id || null,

          parentName:
            parent?.name || null,

          componentProperties:
            extractComponentProperties(
              node
            )

        });

      }

    }


    /*
     * Continue through children.
     */
    if (
      Array.isArray(
        node.children
      )
    ) {

      for (
        const child
        of node.children
      ) {

        walk(
          child,
          pageName,
          node
        );

      }

    }

  }


  walk(document);


  /*
   * Remove exact duplicate node IDs.
   */
  const seen =
    new Set();


  const uniqueResults =
    results.filter(
      result => {

        if (
          seen.has(
            result.nodeId
          )
        ) {

          return false;

        }

        seen.add(
          result.nodeId
        );

        return true;

      }
    );


  /*
   * Highest relevance first.
   */
  uniqueResults.sort(
    (a, b) => {

      if (
        b.score !== a.score
      ) {

        return (
          b.score -
          a.score
        );

      }


      return (
        a.name || ""
      ).localeCompare(
        b.name || ""
      );

    }
  );


  return uniqueResults;

}


module.exports = {

  searchFigmaNodes

};