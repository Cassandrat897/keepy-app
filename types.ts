export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'x' | 'website' | 'google-maps';

export interface Folder {
  id: string;
  name: string;
  userId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  parentId?: string; // If undefined, it's a main category. If defined, it's a subcategory.
  folderId?: string; // Optional: Belongs to a specific folder (Only for Top-Level categories)
  userId?: string;
}

export interface Profile {
  id: string;
  username: string; // For 'website', this is the URL. For others, it's the handle or ID.
  displayName?: string; // Optional custom name
  platform: Platform;
  categoryId: string;
  notes: string;
  createdAt: number;
  userId?: string;
}

export type SortOption = 'a-z' | 'z-a' | 'newest' | 'oldest' | 'color';

export const PASTEL_COLORS = [
  '#FFB3BA', // Red/Pink
  '#FFDFBA', // Orange
  '#FFFFBA', // Yellow
  '#BAFFC9', // Green
  '#BAE1FF', // Blue
  '#E2BAFF', // Purple
  '#F0F0F0', // Gray
  '#C9C9FF', // Indigo
];