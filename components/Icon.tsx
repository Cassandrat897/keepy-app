import React from 'react';
import { 
  Instagram, 
  Plus, 
  Search, 
  Settings, 
  Moon, 
  Sun, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  ChevronRight,
  Filter,
  ExternalLink,
  MoreVertical,
  Share2,
  FolderOpen,
  ArrowLeft,
  ArrowUpDown,
  Facebook,
  Twitter,
  Globe,
  Video, // Keeping Video for general use if needed, but TikTok will use custom
  Lock,
  Check,
  Heart,
  Mail,
  Coffee,
  X
} from 'lucide-react';

// Custom TikTok Icon (Music Note style)
const TikTok = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// Custom X (Twitter) Icon
const TwitterX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    {...props}
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

export const Icons = {
  Instagram,
  Plus,
  Search,
  Settings,
  Moon,
  Sun,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Filter,
  ExternalLink,
  MoreVertical,
  Share2,
  FolderOpen,
  ArrowLeft,
  ArrowUpDown,
  Facebook,
  Twitter,
  Globe,
  Video,
  Lock,
  Check,
  Heart,
  Mail,
  Coffee,
  X,
  TikTok,
  TwitterX
};