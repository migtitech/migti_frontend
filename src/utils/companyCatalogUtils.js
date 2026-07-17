export const MAIN_CATALOG_KEY = "__main__";

export const getCatalogGroupId = (catalog) => {
  const group = catalog?.groupId;
  if (!group) return MAIN_CATALOG_KEY;
  return String(group?._id || group);
};

export const getCatalogGroupLabel = (catalog) => {
  const group = catalog?.groupId;
  if (!group) return "Main catalog";
  return group?.name || "Group catalog";
};

export const buildCatalogSections = (catalogs = [], groups = []) => {
  const byGroupId = new Map();

  catalogs.forEach((catalog) => {
    const groupId = getCatalogGroupId(catalog);
    if (!byGroupId.has(groupId)) {
      byGroupId.set(groupId, []);
    }
    byGroupId.get(groupId).push(catalog);
  });

  const sections = [
    {
      key: MAIN_CATALOG_KEY,
      title: "Main catalog",
      catalogs: byGroupId.get(MAIN_CATALOG_KEY) || [],
    },
  ];

  groups.forEach((group) => {
    const groupId = String(group?._id || group?.id || "");
    if (!groupId) return;
    sections.push({
      key: groupId,
      title: group?.name || "Group catalog",
      catalogs: byGroupId.get(groupId) || [],
    });
  });

  byGroupId.forEach((groupCatalogs, groupId) => {
    if (groupId === MAIN_CATALOG_KEY) return;
    if (sections.some((section) => section.key === groupId)) return;
    const groupName = groupCatalogs[0]?.groupId?.name || "Group catalog";
    sections.push({
      key: groupId,
      title: groupName,
      catalogs: groupCatalogs,
    });
  });

  return sections;
};
