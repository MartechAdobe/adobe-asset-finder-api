function searchFigmaNodes(node, query, results = [], context = {}) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return results;
  }

  let pageName = context.pageName || null;

  // Figma CANVAS represents a page
  if (node.type === "CANVAS") {
    pageName = node.name;
  }

  const searchableFields = [
    node.name,
    node.characters,
    node.description
  ].filter(Boolean);

  const searchableText = searchableFields
    .join(" ")
    .toLowerCase();

  if (searchableText.includes(normalizedQuery)) {
    results.push({
      nodeId: node.id,
      name: node.name,
      type: node.type,
      pageName,
      matchedText: node.characters || null,
      description: node.description || null
    });
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      searchFigmaNodes(
        child,
        query,
        results,
        {
          pageName
        }
      );
    }
  }

  return results;
}

module.exports = {
  searchFigmaNodes
};