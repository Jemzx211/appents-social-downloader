export type JsonObject = {
  [key: string]: any;
};

export type MediaObject = {
  height: number;
  width: number;
  url: string;
};

export type ParentAndMediaObjects = {
  parent: JsonObject; // post related data that contain target fields
  mediaObjects: MediaObject[]; // media items
  path: string;
};

// fields returned in data.json on download
// "raw" is additional data for debugging
export type TargetFields = {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  user_name: string;
  raw?: JsonObject | null;
  errors?: string[] | null;
};

// preferred media width for items to download
// pixel width for images / videos
export enum TargetMediaWidth {
  SMALLEST = 0,
  MEDIUM = 600,
  LARGEST = 1000000,
}
