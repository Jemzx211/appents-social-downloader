const validExtensions: string[] = [
  ".png",
  "format=png",
  ".jpg",
  "format=jpg",
  ".jpeg",
  "format=jpeg",
  ".gif",
  "format=gif",
  ".webp",
  "format=webp",
  ".mp4",
  "format=mp4",
  ".mov",
  "format=mov",
  ".webm",
  "format=webm",
];

type MediaObject = {
  "data-testids": string[];
  src: string;
};

// convert to unique string array
function processMediaObjects(mediaObjects: MediaObject[]) {
  const seenUrls = new Set<string>();

  for (const item of mediaObjects) {
    if (!seenUrls.has(item.src)) {
      seenUrls.add(item.src);
    }
  }

  return Array.from(seenUrls);
}

// depth first search, remembering data-testid values as you descend.
// if you encounter an <img> or <video> tag with file, returnn
const extractMediaObjects = (root: Node) => {
  const mediaObjects: MediaObject[] = [];
  const stack: { node: Node; dataTestIds: string[] }[] = [
    { node: root, dataTestIds: [] },
  ];
  while (stack.length > 0) {
    const { node, dataTestIds } = stack.pop()!;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const testid = element.getAttribute("data-testid");
      const newDataTestIds = testid ? [...dataTestIds, testid] : dataTestIds;

      if (element.tagName === "IMG" || element.tagName === "VIDEO") {
        let src = element.getAttribute("src");

        if (!src && element.tagName === "VIDEO") {
          const source = element.querySelector("source");
          src = source ? source.getAttribute("src") : null;
        }

        if (src) {
          mediaObjects.push({ "data-testids": newDataTestIds, src });
        }
      }

      Array.from(element.childNodes).forEach((child) =>
        stack.push({ node: child, dataTestIds: newDataTestIds })
      );
    }
  }

  const ignore = new Set([
    "tweetText",
    "User-Name",
    "Tweet-User-Avatar",
    "UserAvatar-Container-XDevelopers",
  ]);

  const ignorePath = ["/emoji/", "/profile_images/"];

  // filter out by data-testids or "/emoji/" in url path
  const filtered = mediaObjects.filter((obj) => {
    const hasIgnoreWord = obj["data-testids"].some((testid) =>
      ignore.has(testid)
    );

    // Check if the src contains any of the ignore paths
    const hasIgnoredPath = ignorePath.some(
      (path) => obj.src && obj.src.includes(path) // Check if path is present in src
    );

    return !hasIgnoreWord && !hasIgnoredPath;
  });
  return filtered;
};

function parseSocialMediaNumber(value: string): number {
  const multiplier: { [key: string]: number } = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };

  const match = value.match(/^([\d.]+)([KMB]?)$/);
  if (!match) return parseFloat(value) || 0;

  const [, num, suffix] = match;
  const number = parseFloat(num);
  return number * (multiplier[suffix] || 1);
}

const extractViewCount = (article: HTMLElement) => {
  // Find all <span> elements that contain "Views"
  const spans = Array.from(article.querySelectorAll("span"));

  for (let i = 0; i < spans.length; i++) {
    if (spans[i].textContent?.trim() === "Views") {
      // The number of views is in the span *before* this one
      const viewsSpan = spans[i - 1];
      if (viewsSpan) {
        const viewsText = viewsSpan.textContent?.trim();
        if (viewsText) {
          return parseSocialMediaNumber(viewsText);
        }
      }
    }
  }

  return null; // Return null if no views found
};

function extractRepliesRepostsLikesBookmarks(article: HTMLElement): {
  replies: number;
  reposts: number;
  likes: number;
  bookmarks: number;
} {
  const buttons = Array.from(article.querySelectorAll("button[aria-label]"));

  const result = {
    replies: 0,
    reposts: 0,
    likes: 0,
    bookmarks: 0,
  };

  buttons.forEach((button) => {
    const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || "";

    if (ariaLabel.includes("replies")) {
      const match = ariaLabel.match(/^([\d,]+)\s*replies/i);
      if (match) {
        result.replies = parseSocialMediaNumber(match[1]);
      }
    } else if (ariaLabel.includes("repost")) {
      const match = ariaLabel.match(/^([\d,]+)\s*repost/i);
      if (match) {
        result.reposts = parseSocialMediaNumber(match[1]);
      }
    } else if (ariaLabel.includes("like")) {
      const match = ariaLabel.match(/^([\d,]+)\s*likes?/i);
      if (match) {
        result.likes = parseSocialMediaNumber(match[1]);
      }
    } else if (ariaLabel.includes("bookmark")) {
      const match = ariaLabel.match(/^([\d,]+)\s*bookmarks?/i);
      if (match) {
        result.bookmarks = parseSocialMediaNumber(match[1]);
      }
    }
  });

  return result;
}

export function extractUsernameAndPostId(
  url: string
): { username: string; postId: string } | null {
  const regex = /https?:\/\/x\.com\/([^\/]+)\/status\/(\d+)/;
  const match = url.match(regex);

  if (match) {
    return { username: match[1], postId: match[2] };
  }

  return null;
}

export function extractTweet(html: string) {
  // Parse the HTML string into a DOM using the DOMParser
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  // Find the first <article> element in the document
  const article = document.querySelector("article");
  if (!article) return null;

  // Get text content
  const tweetTextDiv = article.querySelector('div[data-testid="tweetText"]');
  let tweetText = "";
  if (tweetTextDiv) {
    tweetText = Array.from(tweetTextDiv.childNodes)
      .map((node) => node.textContent?.trim()) // Get the textContent of each node
      .filter(Boolean) // Filter out null or undefined values
      .join(" "); // Concatenate all the text content with a space in between
  }
  // Get media URLs
  const mediaObjects = extractMediaObjects(article);
  const fileUrls = processMediaObjects(mediaObjects);

  // Get created time
  const timeElement = article.querySelector("time");
  const strDate = timeElement?.dateTime;
  const created_at = strDate
    ? Math.floor(new Date(timeElement.dateTime).getTime() / 1000)
    : null;

  // Get view count
  const view_count = extractViewCount(article) ?? 0;

  // Get other counts
  const other_counts = extractRepliesRepostsLikesBookmarks(article);

  // Return the result object with content (text) and fileUrls (array of src values)
  return {
    created_at: created_at,
    content: tweetText || "", // Empty string if no text content
    view_count: view_count,
    comment_count: other_counts.replies,
    like_count: other_counts.likes,
    repost_count: other_counts.reposts,
    bookmark_count: other_counts.bookmarks,
    mediaObjects: mediaObjects,
    fileUrls: fileUrls,
  };
}
