// Instagram Data Extraction
import {
  JsonObject,
  MediaObject,
  ParentAndMediaObjects,
  TargetFields,
  TargetMediaWidth,
} from "../types/types";
import { extractFileName } from "../utils/utils";

const mediaExtensions =
  /(\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mov|avi|wmv|flv|mkv))(?=\?|$)/i;

export const extractInstagramPostId = (url: string) => {
  const regex =
    /instagram.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|stories)\/([A-Za-z0-9-_]+)/;
  const match = url.match(regex);
  return match && match[2] ? match[2] : null;
};

// Instagram stores data in script pages
// Extract JSON data from <script type="application/json" data-sjs> tags
export function extractJsonFromScripts(html: string): {}[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const scripts = doc.querySelectorAll<HTMLScriptElement>(
    'script[type="application/json"][data-sjs]'
  );

  const results: { "data-content-len": string; data: any }[] = [];

  scripts.forEach((script) => {
    const len = script.getAttribute("data-content-len") || "";
    try {
      const jsonData = JSON.parse(script.textContent?.trim() || "{}");
      results.push({ "data-content-len": len, data: jsonData });
    } catch (error) {
      console.warn(
        `Skipping script with invalid JSON (data-content-len=${len})`
      );
    }
  });

  // Sorting logic
  results.sort((a, b) => {
    const numA = parseInt(a["data-content-len"], 10);
    const numB = parseInt(b["data-content-len"], 10);

    if (isNaN(numA) && isNaN(numB)) return 0; // Both are non-numeric, keep order
    if (isNaN(numA)) return 1; // Move non-numeric `a` to the end
    if (isNaN(numB)) return -1; // Move non-numeric `b` to the end

    return numB - numA; // Descending order
  });

  return results.map(({ data }) => data); // Return only JSON data
}

// Instagram media urls are in an array, which is a descendant of object
// that has post information. This pattern is repeated multiple times in the same object.
// Find all nodes in the JSON object that match the provided code
// and has descendants with media candidates
export function findMatchingNodes(
  code: string,
  json: JsonObject
): ParentAndMediaObjects[] {
  const results: ParentAndMediaObjects[] = [];
  const stack: {
    node: JsonObject;
    matchedNode: JsonObject | null;
    path: string;
  }[] = [{ node: json, matchedNode: null, path: "" }];

  while (stack.length > 0) {
    const { node, matchedNode, path } = stack.pop()!;
    let newMatchedNode = matchedNode;

    if (node.code === code && "caption" in node) {
      newMatchedNode = node;
    }

    if (newMatchedNode) {
      for (const key in node) {
        if (Array.isArray(node[key])) {
          const mediaObjects = node[key].filter(
            (item: any) =>
              item.height &&
              item.width &&
              typeof item.url === "string" &&
              mediaExtensions.test(item.url)
          );
          if (mediaObjects.length > 0) {
            results.push({
              parent: newMatchedNode,
              mediaObjects: mediaObjects,
              path: `${path}.${key}`,
            });
          }
        }
      }
    }

    for (const key in node) {
      if (typeof node[key] === "object" && node[key] !== null) {
        stack.push({
          node: node[key],
          matchedNode: newMatchedNode,
          path: `${path}.${key}`,
        });
      }
    }
  }

  return results;
}

// find the target fields in any of the parent objects
export const getFields = (jsonList: JsonObject[]): TargetFields => {
  const fields: TargetFields = {
    id: "",
    content: "",
    created_at: "",
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    user_id: "",
    user_name: "",
    raw: null,
  };

  // get fields from any object
  jsonList.forEach((json: JsonObject) => {
    if (json) {
      fields.id = fields.id === "" ? json.pk || "" : fields.id;
      fields.content =
        fields.content === "" ? json.caption?.text || "" : fields.content;
      fields.created_at =
        fields.created_at === ""
          ? json.caption?.created_at || ""
          : fields.created_at;
      fields.like_count =
        fields.like_count === 0 ? json.like_count || 0 : fields.like_count;
      fields.comment_count =
        fields.comment_count === 0
          ? json.comment_count || 0
          : fields.comment_count;
      fields.view_count =
        fields.view_count === 0 ? json.view_count || 0 : fields.view_count;
      fields.user_id =
        fields.user_id === "" ? json.owner?.id || "" : fields.user_id;
      fields.user_name =
        fields.user_name === "" ? json.owner?.username || "" : fields.user_name;
    }
  });

  return fields;
};

// instagram had urls for each media item at different sizes
// get unique media item at preferred size
export function getUniqueMedia(
  mediaObjects: MediaObject[],
  targetWidth: TargetMediaWidth
): Map<string, MediaObject> | null {
  const preferredWidth = targetWidth;
  const mediaMap = new Map<string, MediaObject>();

  mediaObjects.forEach((candidate) => {
    const fileName = extractFileName(candidate.url) || "";
    const existingMedia = mediaMap.get(fileName);

    // Check if the current image is a better choice
    if (!existingMedia) {
      mediaMap.set(fileName, candidate);
    } else {
      const currentDiff = Math.abs(candidate.width - preferredWidth);
      const existingDiff = Math.abs(existingMedia.width - preferredWidth);

      // Retain the image with the smaller width difference
      if (currentDiff < existingDiff) {
        mediaMap.set(fileName, candidate);
      }
    }
  });

  return mediaMap;
}
