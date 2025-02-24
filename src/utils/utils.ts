import { JsonObject } from "../types/types";

export const extractPostId = (url: string) => {
  // Instagram
  const instaGramRegex =
    /instagram.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|stories)\/([A-Za-z0-9-_]+)/;
  const instagramMatch = url.match(instaGramRegex);

  if (instagramMatch && instagramMatch[2]) {
    return { platform: "instagram", postId: instagramMatch[2] };
  }

  // Twitter / X
  const twitterRegex = /(?:x\.com\/(?:[^\/]+)\/status\/)(\d+)/;
  const twitterMatch = url.match(twitterRegex);

  if (twitterMatch && twitterMatch[1]) {
    return { platform: "twitter", postId: twitterMatch[1] };
  }

  return null;
};

export const extractFileName = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filenameWithParams = pathname.split("/").pop();

    if (!filenameWithParams) {
      return null;
    }

    // Check for query parameters to determine file extension
    const params = parsedUrl.searchParams;
    const format = params.get("format");

    // If the format is specified, append the extension accordingly
    if (format && !filenameWithParams.includes(".")) {
      return `${filenameWithParams}.${format}`;
    }

    // Return the filename without query params
    return filenameWithParams.split("?")[0];
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
};

// result added to "raw" key in data.json for debugging
// combines similar data from multiple objects into one object
// adds keys "<key_name>.n" when overlapping keys has different values
export function mergeJsonObjects(
  objects: Record<string, any>[]
): Record<string, any> {
  if (objects.length === 0) return {};

  let combinedObject: JsonObject = { ...objects[0] };

  for (let i = 1; i < objects.length; i++) {
    const currentObject = objects[i];

    for (const key in currentObject) {
      if (!(key in combinedObject)) {
        // If key doesn't exist, add it
        combinedObject[key] = currentObject[key];
      } else if (combinedObject[key] !== currentObject[key]) {
        // If key exists and values don't match, find a new unique key
        let index = 1;
        let newKey = `${key}.${index}`;

        while (newKey in combinedObject) {
          index++;
          newKey = `${key}.${index}`;
        }

        combinedObject[newKey] = currentObject[key];
      }
    }
  }

  return combinedObject;
}
