import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ensureFolderPath,
  extractFolderPath,
  fetchDeltaItems,
  fetchFolderContentsRecursive,
  getAccessToken,
  getDriveId,
  getFileExtension,
  getLatestDeltaToken,
  getSiteInfo,
  type GraphDrive,
  type GraphDriveItem,
} from "../_shared/sharepoint-graph.ts";

interface SharePointConfig {
  id: string;
  organization_id: string;
  site_id: string;
  drive_id: string | null;
  root_folder_path: string;
  last_delta_token: string | null;
  sync_enabled: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action, organization_id, config: configPayload, force_full_sync, folder_path } = body;

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    // ============ SAVE CONFIG ACTION ============
    if (action === "save_config") {
      if (!configPayload?.site_id) {
        throw new Error("site_id is required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const siteInfo = await getSiteInfo(accessToken, configPayload.site_id);

      // Use explicit drive_id from admin selector if provided, otherwise auto-detect
      let driveId: string;
      if (configPayload.drive_id) {
        driveId = configPayload.drive_id;
        console.log(`[Config] Using explicit drive_id from admin: ${driveId}`);
      } else {
        driveId = await getDriveId(accessToken, configPayload.site_id);
        console.log(`[Config] Auto-detected drive_id: ${driveId}`);
      }

      const { data: existing } = await supabase
        .from("sharepoint_config")
        .select("id, root_folder_path")
        .eq("organization_id", organization_id)
        .maybeSingle();

      const configData: Record<string, unknown> = {
        organization_id,
        site_id: configPayload.site_id,
        site_name: siteInfo.name,
        site_url: siteInfo.webUrl,
        drive_id: driveId,
        sync_enabled: configPayload.sync_enabled ?? true,
        sync_interval_minutes: configPayload.sync_interval_minutes ?? 5,
        root_folder_path: configPayload.root_folder_path ?? "/",
      };

      if (existing) {
        const oldPath = existing.root_folder_path || "/";
        const newPath = (configPayload.root_folder_path as string) || "/";

        if (oldPath !== newPath) {
          console.log(`root_folder_path changed from "${oldPath}" to "${newPath}" - clearing delta token and old documents`);
          configData.last_delta_token = null;

          await supabase
            .from("sharepoint_documents")
            .delete()
            .eq("config_id", existing.id);
        }

        await supabase
          .from("sharepoint_config")
          .update(configData)
          .eq("id", existing.id);
      } else {
        await supabase.from("sharepoint_config").insert(configData);
      }

      return new Response(
        JSON.stringify({ success: true, site_name: siteInfo.name, site_url: siteInfo.webUrl }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ DELETE CONFIG ACTION ============
    if (action === "delete_config") {
      const { data: configToDelete } = await supabase
        .from("sharepoint_config")
        .select("id")
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (configToDelete) {
        await supabase
          .from("sharepoint_documents")
          .delete()
          .eq("config_id", configToDelete.id);

        await supabase
          .from("sharepoint_sync_logs")
          .delete()
          .eq("config_id", configToDelete.id);

        await supabase
          .from("sharepoint_config")
          .delete()
          .eq("id", configToDelete.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ LIST DRIVES ACTION ============
    if (action === "list_drives") {
      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) throw new Error("SharePoint credentials not configured.");

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const drivesResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${spCfg.site_id}/drives`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!drivesResp.ok) throw new Error(`Drives query failed: ${drivesResp.status}`);
      const drivesData = await drivesResp.json();
      const drives = ((drivesData.value || []) as GraphDrive[]).map((d) => ({
        id: d.id,
        name: d.name,
        webUrl: d.webUrl,
        driveType: d.driveType,
      }));

      return new Response(
        JSON.stringify({ success: true, drives, current_drive_id: spCfg.drive_id }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ BROWSE FOLDERS ACTION ============
    if (action === "browse_folders") {
      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const browsePath = folder_path || "/";
      const browseDriveId = body.drive_id || spCfg.drive_id;
      let browseUrl: string;

      if (browsePath === "/") {
        browseUrl = `https://graph.microsoft.com/v1.0/drives/${browseDriveId}/root/children`;
      } else {
        const encodedPath = browsePath.split("/").map((s: string) => s ? encodeURIComponent(s) : "").join("/");
        browseUrl = `https://graph.microsoft.com/v1.0/drives/${browseDriveId}/root:${encodedPath}:/children`;
      }

      console.log(`Browse URL: ${browseUrl}`);
      const browseResp = await fetch(browseUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!browseResp.ok) {
        const errText = await browseResp.text();
        throw new Error(`Browse failed: ${browseResp.status} - ${errText}`);
      }
      const browseData = await browseResp.json();
      const folders = ((browseData.value || []) as GraphDriveItem[]).map((item) => ({
        name: item.name,
        isFolder: !!item.folder,
        childCount: item.folder?.childCount ?? null,
        size: item.size,
        webUrl: item.webUrl,
      }));

      return new Response(
        JSON.stringify({ success: true, path: browsePath, items: folders }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ CREATE FOLDER ACTION ============
    if (action === "create_folder") {
      const { folder_path: newFolderPath } = body;
      if (!newFolderPath) {
        throw new Error("folder_path is required for create_folder");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      let driveId = spCfg.drive_id;
      if (!driveId) {
        driveId = await getDriveId(accessToken, spCfg.site_id);
        await supabase.from("sharepoint_config").update({ drive_id: driveId }).eq("id", spCfg.id);
      }

      // Build full path: root_folder_path + requested path
      const rootPath = spCfg.root_folder_path || "/";
      const fullPath = rootPath === "/"
        ? newFolderPath
        : `${rootPath}${newFolderPath.startsWith("/") ? "" : "/"}${newFolderPath}`;

      // Create folders recursively (each segment)
      const segments = fullPath.split("/").filter(Boolean);
      let parentId = "root";
      let createdWebUrl = "";

      for (const segment of segments) {
        // Check if folder already exists
        const childrenUrl = parentId === "root"
          ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
          : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`;

        const existsResp = await fetch(childrenUrl + `?$filter=name eq '${segment}'&$select=id,name,folder,webUrl`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (existsResp.ok) {
          const existsData = await existsResp.json();
          const existing = (existsData.value || []).find(
            (item: GraphDriveItem) => item.name.toLowerCase() === segment.toLowerCase() && item.folder !== undefined
          );
          if (existing) {
            parentId = existing.id;
            createdWebUrl = existing.webUrl || "";
            console.log(`Folder "${segment}" already exists: id=${parentId}`);
            continue;
          }
        }

        // Create folder
        const createUrl = parentId === "root"
          ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
          : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`;

        console.log(`Creating folder "${segment}" under ${parentId}`);
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

        if (!createResp.ok) {
          const errText = await createResp.text();
          // 409 = already exists (race condition) — try to resolve it
          if (createResp.status === 409) {
            console.warn(`Folder "${segment}" conflict (409), resolving...`);
            const retryResp = await fetch(childrenUrl + `?$filter=name eq '${segment}'&$select=id,name,folder,webUrl`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (retryResp.ok) {
              const retryData = await retryResp.json();
              const found = (retryData.value || []).find(
                (item: GraphDriveItem) => item.folder !== undefined
              );
              if (found) {
                parentId = found.id;
                createdWebUrl = found.webUrl || "";
                continue;
              }
            }
          }
          throw new Error(`Failed to create folder "${segment}": ${createResp.status} - ${errText}`);
        }

        const created: GraphDriveItem = await createResp.json();
        parentId = created.id;
        createdWebUrl = created.webUrl || "";
        console.log(`Created folder "${segment}": id=${parentId}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          folder: { id: parentId, webUrl: createdWebUrl, path: fullPath },
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ CREATE CONTRACT FOLDERS ACTION ============
    if (action === "create_contract_folders") {
      const { client_code, tipo_contrato, contrato_id } = body;
      if (!contrato_id) {
        throw new Error("contrato_id is required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) {
        // No SharePoint config — skip silently (not all orgs have SP)
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "No SharePoint config for organization" }),
          { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      let driveId = spCfg.drive_id;
      if (!driveId) {
        driveId = await getDriveId(accessToken, spCfg.site_id);
        await supabase.from("sharepoint_config").update({ drive_id: driveId }).eq("id", spCfg.id);
      }

      // Build structure: Contratos/{ClientCode}/{TipoContrato}/{ContratoId}/[subfolders]
      const rootPath = spCfg.root_folder_path || "/";
      const clientFolder = client_code || "Sem_Codigo";
      const tipoFolder = tipo_contrato || "outro";
      const basePath = rootPath === "/"
        ? `/Contratos/${clientFolder}/${tipoFolder}/${contrato_id}`
        : `${rootPath}/Contratos/${clientFolder}/${tipoFolder}/${contrato_id}`;

      const subfolders = ["Documentos", "Assinaturas", "Correspondencia", "Analise_IA"];
      const allPaths = [basePath, ...subfolders.map((sf) => `${basePath}/${sf}`)];

      let contractFolderWebUrl = "";

      for (const folderFullPath of allPaths) {
        const segments = folderFullPath.split("/").filter(Boolean);
        let parentId = "root";

        for (const segment of segments) {
          const childrenUrl = parentId === "root"
            ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
            : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`;

          // Try to create directly (faster than check-then-create)
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
            if (folderFullPath === basePath && segment === contrato_id) {
              contractFolderWebUrl = created.webUrl || "";
            }
          } else if (createResp.status === 409) {
            // Already exists — resolve ID
            await createResp.text(); // consume body
            const listResp = await fetch(childrenUrl + `?$select=id,name,folder,webUrl`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (listResp.ok) {
              const listData = await listResp.json();
              const found = (listData.value || []).find(
                (item: GraphDriveItem) => item.name.toLowerCase() === segment.toLowerCase() && item.folder !== undefined
              );
              if (found) {
                parentId = found.id;
                if (folderFullPath === basePath && segment === contrato_id) {
                  contractFolderWebUrl = found.webUrl || "";
                }
              } else {
                throw new Error(`Folder "${segment}" conflict but not found in children`);
              }
            }
          } else {
            const errText = await createResp.text();
            throw new Error(`Failed to create folder "${segment}": ${createResp.status} - ${errText}`);
          }
        }
      }

      // Store the SharePoint folder URL on the contract
      if (contractFolderWebUrl) {
        await supabase
          .from("contratos")
          .update({ sharepoint_folder_url: contractFolderWebUrl })
          .eq("id", contrato_id);
      }

      console.log(`Contract folders created for ${contrato_id}: ${basePath}`);

      return new Response(
        JSON.stringify({
          success: true,
          folder_url: contractFolderWebUrl,
          base_path: basePath,
          subfolders,
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ UPLOAD LARGE FILE ACTION (>4MB via upload session) ============
    if (action === "upload_large_file") {
      const { file_base64, file_name, folder_path: uploadLargeFolderPath } = body;
      if (!file_base64 || !file_name) {
        throw new Error("file_base64 and file_name are required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      let driveId = spCfg.drive_id;
      if (!driveId) {
        driveId = await getDriveId(accessToken, spCfg.site_id);
        await supabase.from("sharepoint_config").update({ drive_id: driveId }).eq("id", spCfg.id);
      }

      // Build full folder path
      const rootPath = spCfg.root_folder_path || "/";
      const currentFolder = uploadLargeFolderPath || "/";
      let folderFullPath: string;
      if (rootPath === "/") {
        folderFullPath = currentFolder === "/" ? "/" : currentFolder;
      } else {
        folderFullPath = currentFolder === "/" ? rootPath : `${rootPath}${currentFolder}`;
      }

      // Ensure parent folder exists before uploading
      if (folderFullPath !== "/") {
        console.log(`Ensuring folder exists: ${folderFullPath}`);
        await ensureFolderPath(accessToken, driveId, folderFullPath);
      }

      const fullPath = folderFullPath === "/"
        ? `/${file_name}`
        : `${folderFullPath}/${file_name}`;

      // Decode base64 to binary
      const binaryString = atob(file_base64);
      const fileBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }

      const fileSize = fileBytes.length;
      console.log(`Large file upload: ${file_name}, size: ${fileSize} bytes`);

      // Create upload session
      const encodedPath = fullPath.split("/").map((s: string) => s ? encodeURIComponent(s) : "").join("/");
      const sessionUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/createUploadSession`;

      const sessionResp = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: {
            "@microsoft.graph.conflictBehavior": "replace",
            name: file_name,
          },
        }),
      });

      if (!sessionResp.ok) {
        const errText = await sessionResp.text();
        throw new Error(`Failed to create upload session: ${sessionResp.status} - ${errText}`);
      }

      const sessionData = await sessionResp.json();
      const uploadUrl = sessionData.uploadUrl;

      // Upload in 10MB chunks
      const CHUNK_SIZE = 10 * 1024 * 1024;
      let offset = 0;
      let uploadedItem: GraphDriveItem | null = null;

      while (offset < fileSize) {
        const end = Math.min(offset + CHUNK_SIZE, fileSize);
        const chunk = fileBytes.slice(offset, end);

        const chunkResp = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${offset}-${end - 1}/${fileSize}`,
          },
          body: chunk,
        });

        if (chunkResp.status === 200 || chunkResp.status === 201) {
          // Upload complete
          uploadedItem = await chunkResp.json();
          console.log(`Upload complete: ${uploadedItem!.name}`);
        } else if (chunkResp.status === 202) {
          // More chunks needed
          console.log(`Chunk uploaded: ${offset}-${end - 1}/${fileSize}`);
        } else {
          const errText = await chunkResp.text();
          throw new Error(`Chunk upload failed at ${offset}: ${chunkResp.status} - ${errText}`);
        }

        offset = end;
      }

      if (!uploadedItem) {
        throw new Error("Upload completed but no item returned");
      }

      // Insert record in sharepoint_documents
      const docData = {
        organization_id: spCfg.organization_id,
        config_id: spCfg.id,
        sharepoint_item_id: uploadedItem.id,
        sharepoint_drive_id: driveId,
        name: uploadedItem.name,
        file_extension: getFileExtension(uploadedItem.name),
        mime_type: uploadedItem.file?.mimeType || null,
        size_bytes: uploadedItem.size || null,
        web_url: uploadedItem.webUrl || null,
        download_url: uploadedItem["@microsoft.graph.downloadUrl"] || null,
        folder_path: currentFolder,
        is_folder: false,
        sharepoint_modified_at: uploadedItem.lastModifiedDateTime || null,
        sharepoint_modified_by: uploadedItem.lastModifiedBy?.user?.displayName || null,
        etag: uploadedItem.eTag || null,
        synced_at: new Date().toISOString(),
        is_deleted: false,
      };

      await supabase.from("sharepoint_documents").upsert(docData, {
        onConflict: "config_id,sharepoint_item_id",
      });

      return new Response(
        JSON.stringify({ success: true, item: { id: uploadedItem.id, name: uploadedItem.name, webUrl: uploadedItem.webUrl, size: uploadedItem.size } }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ UPLOAD FILE ACTION ============
    if (action === "upload_file") {
      const { file_base64, file_name, folder_path: uploadFolderPath } = body;
      if (!file_base64 || !file_name) {
        throw new Error("file_base64 and file_name are required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      let driveId = spCfg.drive_id;
      if (!driveId) {
        driveId = await getDriveId(accessToken, spCfg.site_id);
        await supabase.from("sharepoint_config").update({ drive_id: driveId }).eq("id", spCfg.id);
      }

      // Build the full folder path: root_folder_path + current folder
      const rootPath = spCfg.root_folder_path || "/";
      const currentFolder = uploadFolderPath || "/";
      let folderFullPath: string;
      if (rootPath === "/") {
        folderFullPath = currentFolder === "/" ? "/" : currentFolder;
      } else {
        folderFullPath = currentFolder === "/" ? rootPath : `${rootPath}${currentFolder}`;
      }

      // Ensure parent folder exists before uploading
      if (folderFullPath !== "/") {
        console.log(`Ensuring folder exists: ${folderFullPath}`);
        await ensureFolderPath(accessToken, driveId, folderFullPath);
      }

      const fullPath = folderFullPath === "/"
        ? `/${file_name}`
        : `${folderFullPath}/${file_name}`;

      // Decode base64 to binary
      const binaryString = atob(file_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload via Graph API PUT (up to 4MB)
      const encodedPath = fullPath.split("/").map((s: string) => s ? encodeURIComponent(s) : "").join("/");
      const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;
      console.log(`Uploading file to: ${uploadUrl}`);

      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error("Upload error:", errText);
        throw new Error(`Upload failed: ${uploadResp.status} - ${errText}`);
      }

      const uploadedItem: GraphDriveItem = await uploadResp.json();
      console.log(`File uploaded: id=${uploadedItem.id}, name=${uploadedItem.name}`);

      // Insert record in sharepoint_documents so it appears immediately
      const docData = {
        organization_id: spCfg.organization_id,
        config_id: spCfg.id,
        sharepoint_item_id: uploadedItem.id,
        sharepoint_drive_id: driveId,
        name: uploadedItem.name,
        file_extension: getFileExtension(uploadedItem.name),
        mime_type: uploadedItem.file?.mimeType || null,
        size_bytes: uploadedItem.size || null,
        web_url: uploadedItem.webUrl || null,
        download_url: uploadedItem["@microsoft.graph.downloadUrl"] || null,
        folder_path: currentFolder,
        is_folder: false,
        sharepoint_modified_at: uploadedItem.lastModifiedDateTime || null,
        sharepoint_modified_by: uploadedItem.lastModifiedBy?.user?.displayName || null,
        etag: uploadedItem.eTag || null,
        synced_at: new Date().toISOString(),
        is_deleted: false,
      };

      await supabase.from("sharepoint_documents").upsert(docData, {
        onConflict: "config_id,sharepoint_item_id",
      });

      return new Response(
        JSON.stringify({ success: true, item: { id: uploadedItem.id, name: uploadedItem.name, webUrl: uploadedItem.webUrl } }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ============ SYNC ACTION (default) ============
    const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
    const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
    const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error(
        "SharePoint credentials not configured. Please add SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_TENANT_ID."
      );
    }

    const { data: configs, error: configError } = await supabase
      .from("sharepoint_config")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("sync_enabled", true);

    if (configError) {
      throw new Error(`Failed to fetch config: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No SharePoint configuration found. Please configure SharePoint integration first.",
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const spConfig: SharePointConfig = configs[0];

    const { data: syncLog } = await supabase
      .from("sharepoint_sync_logs")
      .insert({
        config_id: spConfig.id,
        organization_id: spConfig.organization_id,
        status: "running",
        delta_token_used: force_full_sync ? null : spConfig.last_delta_token,
      })
      .select()
      .single();

    const logId = syncLog?.id;

    try {
      console.log("Getting Microsoft Graph access token...");
      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

      console.log("Validating SharePoint site...");
      const siteInfo = await getSiteInfo(accessToken, spConfig.site_id);

      let driveId = spConfig.drive_id;
      if (!driveId) {
        console.log("Getting document library drive ID...");
        driveId = await getDriveId(accessToken, spConfig.site_id);

        await supabase
          .from("sharepoint_config")
          .update({ drive_id: driveId, site_name: siteInfo.name, site_url: siteInfo.webUrl })
          .eq("id", spConfig.id);
      }

      const rootPath = spConfig.root_folder_path || "/";
      const useRecursiveListing = force_full_sync || !spConfig.last_delta_token;

      let items: GraphDriveItem[];
      let newDeltaToken = "";
      let needsFiltering = false;

      if (useRecursiveListing) {
        // ===== FULL SYNC: Use recursive children listing =====
        console.log(`Full sync: listing contents recursively from path: ${rootPath}`);

        // Clear existing documents for a clean sync
        await supabase
          .from("sharepoint_documents")
          .delete()
          .eq("config_id", spConfig.id);

        items = await fetchFolderContentsRecursive(accessToken, driveId, rootPath);
        needsFiltering = false; // Already scoped to root_folder_path

        // Get a fresh delta token for future incremental syncs
        newDeltaToken = await getLatestDeltaToken(accessToken, driveId);
      } else {
        // ===== INCREMENTAL SYNC: Use delta query =====
        console.log("Incremental sync: using delta query...");
        const deltaResult = await fetchDeltaItems(accessToken, driveId, spConfig.last_delta_token!);
        items = deltaResult.items;
        newDeltaToken = deltaResult.newDeltaToken;
        needsFiltering = true;
      }

      console.log(`Found ${items.length} items to process`);

      let itemsAdded = 0;
      let itemsUpdated = 0;
      let itemsDeleted = 0;

      // Filter items by root_folder_path (only needed for delta/incremental sync)
      let filteredItems = items;
      if (needsFiltering && rootPath !== "/") {
        filteredItems = items.filter((item) => {
          if (item.deleted) return true;
          const parentPath = item.parentReference?.path || "";
          const rootPrefix = `/drives/${driveId}/root:`;
          const fullParentPath = parentPath.startsWith(rootPrefix)
            ? parentPath.substring(rootPrefix.length)
            : parentPath.endsWith("/root") ? "/" : "/";

          if (fullParentPath === rootPath || fullParentPath.startsWith(rootPath + "/")) {
            return true;
          }

          if (item.folder) {
            const itemFullPath = fullParentPath === "/"
              ? "/" + item.name
              : fullParentPath + "/" + item.name;
            if (itemFullPath === rootPath) {
              return true;
            }
          }

          return false;
        });
        console.log(`Filtered to ${filteredItems.length} items within root_folder_path: ${rootPath}`);
      }

      for (const item of filteredItems) {
        if (item.deleted) {
          const { error: deleteError } = await supabase
            .from("sharepoint_documents")
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq("config_id", spConfig.id)
            .eq("sharepoint_item_id", item.id);

          if (!deleteError) itemsDeleted++;
          continue;
        }

        let folderPath = extractFolderPath(item, driveId);
        const isFolder = !!item.folder;

        // Adjust folder_path relative to root_folder_path
        if (rootPath !== "/") {
          if (folderPath.startsWith(rootPath)) {
            folderPath = folderPath.substring(rootPath.length) || "/";
          }
        }

        const documentData = {
          organization_id: spConfig.organization_id,
          config_id: spConfig.id,
          sharepoint_item_id: item.id,
          sharepoint_drive_id: driveId,
          name: item.name,
          file_extension: isFolder ? null : getFileExtension(item.name),
          mime_type: item.file?.mimeType || null,
          size_bytes: item.size || null,
          web_url: item.webUrl || null,
          download_url: item["@microsoft.graph.downloadUrl"] || null,
          folder_path: folderPath,
          is_folder: isFolder,
          sharepoint_modified_at: item.lastModifiedDateTime || null,
          sharepoint_modified_by: item.lastModifiedBy?.user?.displayName || null,
          etag: item.eTag || null,
          synced_at: new Date().toISOString(),
          is_deleted: false,
          deleted_at: null,
        };

        const { data: existing } = await supabase
          .from("sharepoint_documents")
          .select("id")
          .eq("config_id", spConfig.id)
          .eq("sharepoint_item_id", item.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("sharepoint_documents")
            .update(documentData)
            .eq("id", existing.id);
          itemsUpdated++;
        } else {
          await supabase.from("sharepoint_documents").insert(documentData);
          itemsAdded++;
        }
      }

      await supabase
        .from("sharepoint_config")
        .update({
          last_delta_token: newDeltaToken,
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("id", spConfig.id);

      if (logId) {
        await supabase
          .from("sharepoint_sync_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "success",
            items_found: items.length,
            items_added: itemsAdded,
            items_updated: itemsUpdated,
            items_deleted: itemsDeleted,
            delta_token_new: newDeltaToken,
          })
          .eq("id", logId);
      }

      console.log(`Sync completed: ${itemsAdded} added, ${itemsUpdated} updated, ${itemsDeleted} deleted`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items_found: items.length,
            items_added: itemsAdded,
            items_updated: itemsUpdated,
            items_deleted: itemsDeleted,
            site_name: siteInfo.name,
            site_url: siteInfo.webUrl,
          },
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    } catch (syncError) {
      console.error("Sync error:", syncError);
      const syncMsg = syncError instanceof Error ? syncError.message : String(syncError);

      await supabase
        .from("sharepoint_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: syncMsg,
        })
        .eq("id", spConfig.id);

      if (logId) {
        await supabase
          .from("sharepoint_sync_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "error",
            error_message: syncMsg,
          })
          .eq("id", logId);
      }

      throw syncError;
    }
  } catch (error) {
    console.error("Error in sync-sharepoint function:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
