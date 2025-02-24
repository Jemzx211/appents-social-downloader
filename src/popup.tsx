import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ParentAndMediaObjects,
  TargetFields,
  TargetMediaWidth,
} from "./types/types";
import { savePost } from "./utils/save";
import { extractPostId, mergeJsonObjects } from "./utils/utils";
import {
  extractJsonFromScripts,
  findMatchingNodes,
  getFields,
  getUniqueMedia,
} from "./instagram/extract";
import { extractTweet, extractUsernameAndPostId } from "./twitter/extract";

const Popup = () => {
  const [postId, setPostId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [twitterUser, setTwitterUser] = useState<string | null>(null);

  const [targetMediaWidth, setTargetMediaWidth] = useState(
    TargetMediaWidth.MEDIUM
  );
  const [includeRaw, setIncludeRaw] = useState(false);

  const getPlatformName = (platform: string) => {
    if (platform == "instagram") return "Instagram";
    if (platform == "twitter") return "X (Twitter)";
    return "unknown";
  };

  useEffect(() => {
    chrome.storage.sync.get({ targetMediaWidth, includeRaw }, (items) => {
      setTargetMediaWidth(items.targetMediaWidth);
      setIncludeRaw(items.includeRaw);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0]?.url;
      if (url) {
        const platformAndId = extractPostId(url);
        setPostId(platformAndId?.postId ?? null);
        setPlatform(platformAndId?.platform ?? null);
        if (platformAndId?.platform === "twitter") {
          const twitter = extractUsernameAndPostId(url);
          setTwitterUser(twitter?.username ?? null);
        }
      }
    });
  }, []);

  useEffect(() => {}, [platform]);

  const [result, setResult] = useState<string>(
    "Click Download to save post data and images."
  );

  const saveClickedHanlder = () => {
    setResult("");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0].id || !postId) return;

      console.log("Sending message to content script");
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getPageHTML" },
        (response) => {
          console.log("Received response from content script", response);
          if (!response?.html) {
            setResult("Retry once page finished loading.");
            return;
          }
          if (platform == "instagram")
            return saveInstagramClickHandler(response.html);
          if (platform == "twitter")
            return saveTwitterClickHandler(response.html);
        }
      );
    });
  };

  const saveInstagramClickHandler = (html: string) => {
    const parentAndMediaObjects: ParentAndMediaObjects[] = [];

    if (platform != "instagram" || !postId) return;
    const scriptJsons = extractJsonFromScripts(html);
    scriptJsons.forEach((json) => {
      const matches = findMatchingNodes(postId, json);
      if (matches.length > 0) {
        matches.forEach((match) => {
          parentAndMediaObjects.push(match);
        });
      }
    });

    const parents = parentAndMediaObjects.flatMap((pmo) => pmo.parent);
    const mediaObjects = parentAndMediaObjects.flatMap(
      (pmo) => pmo.mediaObjects || []
    );

    const fields = getFields(parents);
    if (includeRaw) fields.raw = mergeJsonObjects(parents);
    const mediaMap = getUniqueMedia(mediaObjects, targetMediaWidth);
    const fileUrls = Array.from(mediaMap?.values() || []).map((m) => m.url);

    savePost(platform, postId, fields, fileUrls).then((result) => {
      setResult(result);
    });
  };

  const saveTwitterClickHandler = (html: string) => {
    if (platform != "twitter" || !postId) return;

    const result = extractTweet(html);

    if (!result) return;

    const fields: TargetFields = {
      id: postId ?? "x",
      created_at: result.created_at?.toString() ?? "",
      content: result.content,
      view_count: result.view_count,
      like_count: result.like_count,
      comment_count: result.comment_count,
      user_id: twitterUser ?? "",
      user_name: twitterUser ?? "",
      raw: includeRaw ? result : null,
    };

    savePost(platform, postId, fields, result.fileUrls).then((result) => {
      setResult(result);
    });
  };

  return (
    <div
      style={{
        minWidth: "260px",
        minHeight: "200px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div id="content" style={{ textAlign: "center" }}>
        {!postId && (
          <div style={{ padding: "20px" }}>
            <h3>Download Social Post</h3>
            <p>
              Navigate to an Instagram or X (Twitter) post to save its data and
              media.
            </p>
          </div>
        )}

        {platform && postId && (
          <div style={{ padding: "20px" }}>
            <div>
              <b>{getPlatformName(platform)} Post Detected</b>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div>{postId}</div>

              <button
                style={{
                  width: "150px",
                  padding: "10px 15px",
                  backgroundColor: "#007BFF",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
                disabled={!postId}
                onClick={saveClickedHanlder}
              >
                Download
              </button>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: "10px",
                  fontSize: "12px",
                }}
              >
                {result}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
