import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TargetMediaWidth } from "./types/types";

const Options = () => {
  const [status, setStatus] = useState("");
  const [targetMediaWidth, setTargetMediaWidth] = useState(
    TargetMediaWidth.MEDIUM
  );
  const [includeRaw, setIncludeRaw] = useState(false);

  useEffect(() => {
    // Restore stored values
    chrome.storage.sync.get(
      { targetMediaWidth: TargetMediaWidth.MEDIUM, includeRaw: false },
      (items) => {
        setTargetMediaWidth(items.targetMediaWidth);
        setIncludeRaw(items.includeRaw);
      }
    );
  }, []);

  const onMediaWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetMediaWidth = Number(e.target.value);
    setTargetMediaWidth(targetMediaWidth);
    chrome.storage.sync.set({ targetMediaWidth }, () => {
      setStatus("Downloaded Media Size setting saved.");
      const id = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(id);
    });
  };

  const onIncludeRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeRaw(e.target.checked);
    chrome.storage.sync.set({ includeRaw: e.target.checked }, () => {
      setStatus("Include Raw setting saved.");
      const id = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(id);
    });
  };

  return (
    <div
      style={{
        paddingLeft: "8px",
        maxWidth: "400px",
        height: "200px",
        margin: "auto",
      }}
    >
      <div id="targetMediaWidth">
        <h3>Downloaded Media Size</h3>
        <select
          value={targetMediaWidth}
          onChange={(e) => onMediaWidthChange(e)}
        >
          <option value={TargetMediaWidth.LARGEST}>Largest</option>
          <option value={TargetMediaWidth.MEDIUM}>Medium</option>
          <option value={TargetMediaWidth.SMALLEST}>Smallest</option>
        </select>
        <p>
          Preference when images/videos are available in difference sizes.
          Medium targets width closest to 600px.
        </p>
      </div>
      <div id="includeRaw">
        <h3>Include Raw</h3>
        <input
          type="checkbox"
          id="includeRaw"
          checked={includeRaw}
          onChange={onIncludeRawChange}
        />
        <label htmlFor="includeRaw">
          Include raw in data.json for debugging purposes.
        </label>
      </div>
      <div style={{ marginTop: "10px", color: "green" }}>{status}</div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
