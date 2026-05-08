// Microsoft Graph API helpers for SharePoint operations.
// Used by sync-sharepoint and provision-client-sharepoint edge functions.

export interface GraphDriveItem {
  id: string;
  name: string;
  parentReference?: {
    id?: string;
    path?: string;
  };
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  size?: number;
  webUrl?: string;
  "@microsoft.graph.downloadUrl"?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: {
    user?: { displayName?: string };
  };
  lastModifiedBy?: {
    user?: { displayName?: string };
  };
  eTag?: string;
  deleted?: { state: string };
}

export interface GraphDrive {
  id: string;
  name: string;
  webUrl: string;
  driveType?: string;
}

// Get Microsoft Graph access token using client credentials flow.
export async function getAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get the default document library drive ID for a site.
export async function getDriveId(accessToken: string, siteId: string): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`Failed to get drive: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

// Get site info to validate configuration.
export async function getSiteInfo(
  accessToken: string,
  siteId: string,
): Promise<{ name: string; webUrl: string }> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Site info error:", error);
    throw new Error(
      `Failed to get site info: ${response.status}. Verifique se o Site ID está correto.`,
    );
  }

  const data = await response.json();
  return { name: data.displayName || data.name, webUrl: data.webUrl };
}

// Resolve a folder path to its item ID (with retry + children-listing fallback).
// If a segment doesn't exist along the path it is auto-created.
export async function resolveFolderPathToId(
  accessToken: string,
  driveId: string,
  folderPath: string,
): Promise<{ id: string; name: string }> {
  const encodedPath = folderPath
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");

  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}`;
  console.log(`Resolving folder path: ${url}`);

  // Attempt 1: direct path resolution
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (response.ok) {
    const data = await response.json();
    console.log(`Resolved folder (primary): id=${data.id}, name=${data.name}`);
    return { id: data.id, name: data.name };
  }

  const status1 = response.status;
  const body1 = await response.text();

  if (status1 !== 404) {
    console.error("Resolve folder error (non-404):", body1);
    throw new Error(`Folder not found at path "${folderPath}": ${status1} - ${body1}`);
  }

  console.warn(`Path resolution returned 404 – retrying once after 1 s …`);

  // Attempt 2: retry after 1 s
  await new Promise((r) => setTimeout(r, 1000));

  const response2 = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (response2.ok) {
    const data = await response2.json();
    console.log(`Resolved folder (retry): id=${data.id}, name=${data.name}`);
    return { id: data.id, name: data.name };
  }

  const body2 = await response2.text();
  console.warn(`Retry also returned ${response2.status} – falling back to children listing`);
  void body2;

  // Attempt 3: fallback – resolve segment by segment via /children
  const segments = folderPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Folder not found at path "${folderPath}": ${status1} - ${body1}`);
  }

  let currentId = "root";
  let currentName = "root";

  for (const segment of segments) {
    const childrenUrl =
      currentId === "root"
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${currentId}/children`;

    console.log(`Fallback: listing children of "${currentName}" to find "${segment}" …`);

    const childResp = await fetch(childrenUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!childResp.ok) {
      const childErr = await childResp.text();
      console.error("Fallback children error:", childErr);
      throw new Error(
        `Fallback failed listing children of "${currentName}": ${childResp.status} - ${childErr}`,
      );
    }

    const childData = await childResp.json();
    const children: { id: string; name: string; folder?: unknown }[] = childData.value || [];

    let match = children.find(
      (c) => c.name.toLowerCase() === segment.toLowerCase() && c.folder !== undefined,
    );

    if (!match) {
      // Folder doesn't exist — create it automatically
      console.log(`Fallback: folder "${segment}" not found in "${currentName}" — creating it`);
      const createUrl = childrenUrl;
      const createResp = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: segment,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      });

      if (createResp.ok) {
        const created = await createResp.json();
        currentId = created.id;
        currentName = segment;
        console.log(`Fallback: created folder "${segment}" → id=${currentId}`);
        continue;
      } else if (createResp.status === 409) {
        // Race condition: created between list and create — re-list
        await createResp.text();
        const relistResp = await fetch(childrenUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (relistResp.ok) {
          const relistData = await relistResp.json();
          const reMatch = (relistData.value || []).find(
            (c: { name: string; folder?: unknown }) =>
              c.name.toLowerCase() === segment.toLowerCase() && c.folder !== undefined,
          );
          if (reMatch) {
            match = reMatch;
          } else {
            throw new Error(`Folder "${segment}" conflict but not found on re-list`);
          }
        } else {
          throw new Error(`Failed to re-list after conflict for "${segment}"`);
        }
      } else {
        const errText = await createResp.text();
        throw new Error(
          `Failed to auto-create folder "${segment}": ${createResp.status} - ${errText}`,
        );
      }
    }

    if (match) {
      currentId = match.id;
      currentName = match.name;
      console.log(`Fallback resolved segment "${segment}" → id=${currentId}`);
    }
  }

  console.log(`Resolved folder (fallback): id=${currentId}, name=${currentName}`);
  return { id: currentId, name: currentName };
}

// Ensure a folder path exists, creating segments as needed. Returns the leaf folder ID.
export async function ensureFolderPath(
  accessToken: string,
  driveId: string,
  folderPath: string,
): Promise<string> {
  const segments = folderPath.split("/").filter(Boolean);
  if (segments.length === 0) return "root";

  let parentId = "root";
  for (const segment of segments) {
    const childrenUrl =
      parentId === "root"
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`;

    const createResp = await fetch(childrenUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });

    if (createResp.ok) {
      const created: GraphDriveItem = await createResp.json();
      parentId = created.id;
    } else if (createResp.status === 409) {
      await createResp.text();
      const listResp = await fetch(
        childrenUrl + `?$filter=name eq '${segment}'&$select=id,name,folder`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (listResp.ok) {
        const listData = await listResp.json();
        const found = (listData.value || []).find(
          (item: GraphDriveItem) =>
            item.name.toLowerCase() === segment.toLowerCase() && item.folder !== undefined,
        );
        if (found) {
          parentId = found.id;
          continue;
        }
      }
      const encodedPath = segments
        .slice(0, segments.indexOf(segment) + 1)
        .map((s) => encodeURIComponent(s))
        .join("/");
      const getResp = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (getResp.ok) {
        const item = await getResp.json();
        parentId = item.id;
      } else {
        const errText = await getResp.text();
        throw new Error(
          `Failed to resolve existing folder "${segment}": ${getResp.status} - ${errText}`,
        );
      }
    } else {
      const errText = await createResp.text();
      throw new Error(`Failed to ensure folder "${segment}": ${createResp.status} - ${errText}`);
    }
  }

  return parentId;
}

// Fetch children of a folder by ID with pagination.
export async function fetchFolderChildrenById(
  accessToken: string,
  driveId: string,
  folderId: string,
): Promise<GraphDriveItem[]> {
  let url: string = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children`;

  console.log(`Fetching children from: ${url}`);

  const allItems: GraphDriveItem[] = [];

  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!response.ok) {
      const error = await response.text();
      console.error("Children query error:", error);
      throw new Error(`Children query failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    allItems.push(...(data.value || []));

    url = data["@odata.nextLink"] || "";
  }

  console.log(`Found ${allItems.length} children`);
  return allItems;
}

// Recursively fetch children by folder ID (for subfolders).
export async function fetchFolderChildrenRecursiveById(
  accessToken: string,
  driveId: string,
  folderId: string,
  folderName: string,
): Promise<GraphDriveItem[]> {
  void folderName;
  const allItems: GraphDriveItem[] = [];
  const children = await fetchFolderChildrenById(accessToken, driveId, folderId);
  allItems.push(...children);

  const subfolders = children.filter((item) => !!item.folder);
  for (const subfolder of subfolders) {
    const subChildren = await fetchFolderChildrenRecursiveById(
      accessToken,
      driveId,
      subfolder.id,
      subfolder.name,
    );
    allItems.push(...subChildren);
  }

  return allItems;
}

// Recursively fetch all contents of a folder.
export async function fetchFolderContentsRecursive(
  accessToken: string,
  driveId: string,
  folderPath: string,
): Promise<GraphDriveItem[]> {
  console.log(`Starting recursive fetch for path: ${folderPath}`);

  const allItems: GraphDriveItem[] = [];

  if (folderPath === "/") {
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
    console.log(`Fetching root children from: ${url}`);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Root children query failed: ${response.status} - ${error}`);
    }
    const data = await response.json();
    const children: GraphDriveItem[] = data.value || [];
    allItems.push(...children);

    const subfolders = children.filter((item) => !!item.folder);
    console.log(`Found ${subfolders.length} subfolders in root`);
    for (const subfolder of subfolders) {
      const subChildren = await fetchFolderChildrenRecursiveById(
        accessToken,
        driveId,
        subfolder.id,
        subfolder.name,
      );
      allItems.push(...subChildren);
    }
  } else {
    const folderInfo = await resolveFolderPathToId(accessToken, driveId, folderPath);
    const children = await fetchFolderChildrenById(accessToken, driveId, folderInfo.id);
    allItems.push(...children);

    const subfolders = children.filter((item) => !!item.folder);
    console.log(`Found ${subfolders.length} subfolders in ${folderPath}`);
    for (const subfolder of subfolders) {
      const subChildren = await fetchFolderChildrenRecursiveById(
        accessToken,
        driveId,
        subfolder.id,
        subfolder.name,
      );
      allItems.push(...subChildren);
    }
  }

  console.log(`Total items found recursively: ${allItems.length}`);
  return allItems;
}

// Get the latest delta token without fetching all items.
export async function getLatestDeltaToken(
  accessToken: string,
  driveId: string,
): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/delta?token=latest`;
  console.log(`Getting latest delta token from: ${url}`);

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!response.ok) {
    const error = await response.text();
    console.error("Delta token error:", error);
    throw new Error(`Failed to get delta token: ${response.status}`);
  }

  const data = await response.json();
  const deltaLink = data["@odata.deltaLink"] || "";
  console.log(`Got delta token (link length: ${deltaLink.length})`);
  return deltaLink;
}

// Fetch items using delta query (incremental sync).
export async function fetchDeltaItems(
  accessToken: string,
  driveId: string,
  deltaToken: string,
): Promise<{ items: GraphDriveItem[]; newDeltaToken: string }> {
  let url = deltaToken;

  const allItems: GraphDriveItem[] = [];
  let newDeltaToken = "";

  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!response.ok) {
      const error = await response.text();
      console.error("Delta query error:", error);
      throw new Error(`Delta query failed: ${response.status}`);
    }

    const data = await response.json();
    allItems.push(...(data.value || []));

    if (data["@odata.nextLink"]) {
      url = data["@odata.nextLink"];
    } else {
      url = "";
      newDeltaToken = data["@odata.deltaLink"] || "";
    }
  }

  if (allItems.length > 0) {
    console.log(
      `Delta first item: id=${allItems[0].id}, name=${allItems[0].name}, parentPath=${allItems[0].parentReference?.path}`,
    );
  }

  return { items: allItems, newDeltaToken };
}

// Extract folder path from parent reference.
export function extractFolderPath(item: GraphDriveItem, driveId: string): string {
  const parentPath = item.parentReference?.path || "";
  const rootPrefix = `/drives/${driveId}/root:`;

  if (parentPath.startsWith(rootPrefix)) {
    return parentPath.substring(rootPrefix.length) || "/";
  }

  if (parentPath.endsWith("/root")) {
    return "/";
  }

  return "/";
}

// Get file extension from filename.
export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return null;
  return filename.substring(lastDot + 1).toLowerCase();
}
