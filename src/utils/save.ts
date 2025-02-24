import { TargetFields } from "../types/types";
import { extractFileName } from "./utils";

export const savePost = async (
  folderPrefix: string,
  postId: string,
  fields: TargetFields,
  fileUrls: string[]
): Promise<string> => {
  try {
    const errors: string[] = [];
    const postDir = `${folderPrefix}-${postId}`;

    // Download and save files
    fileUrls.forEach((fileUrl) => {
      const fileName = extractFileName(fileUrl);

      // require valid name and extension
      if (!fileName || !fileName.includes(".")) {
        errors.push(
          `file download skipped: ${fileUrl} does not contain valid file name`
        );
        return;
      }

      chrome.downloads.download({
        url: fileUrl,
        filename: `${postDir}/${fileName}`,
        saveAs: false,
      });
    });

    if (errors.length > 0) {
      // create fields.errors if null
      if (!fields.errors) {
        fields.errors = [];
      }

      // add "errors" key and array of errors to fields.raw
      fields.errors.push(...errors);
    }

    const metadataBlob = new Blob([JSON.stringify(fields, null, 2)], {
      type: "application/json",
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);

    chrome.downloads.download({
      url: metadataUrl,
      filename: `${postDir}/data.json`,
      saveAs: false,
    });

    return `Saved post to Downloads/${postDir}`;
  } catch (error) {
    const mesg = error instanceof Error ? error.message : "Unknown error";
    return mesg;
  }
};
