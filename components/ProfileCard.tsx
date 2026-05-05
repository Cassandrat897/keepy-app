import React from 'react';
import { Profile, Category, Platform } from '../types';
import { Icons } from './Icon';

interface ProfileCardProps {
  profile: Profile;
  category?: Category;
  path?: string; // New prop for breadcrumbs
  readonly?: boolean;
  onClick?: (profile: Profile) => void;
  onEdit?: (e: React.MouseEvent, profile: Profile) => void;
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'facebook':
      return (
        <div className="w-12 h-12 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm">
          <Icons.Facebook className="w-6 h-6" />
        </div>
      );
    case 'x':
      return (
        <div className="w-12 h-12 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white shadow-sm border border-gray-800">
          <Icons.TwitterX className="w-5 h-5" />
        </div>
      );
    case 'tiktok':
      return (
        <div className="w-12 h-12 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white shadow-sm border border-gray-800">
          <Icons.TikTok className="w-6 h-6" />
        </div>
      );
    case 'website':
      return (
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-white shadow-sm">
          <Icons.Globe className="w-6 h-6" />
        </div>
      );
    case 'google-maps':
      return (
        <div className="w-12 h-12 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white shadow-sm">
          <Icons.MapPin className="w-6 h-6" />
        </div>
      );
    case 'instagram':
    default:
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px] flex-shrink-0 shadow-sm">
           <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
              <Icons.Instagram className="w-6 h-6 text-gray-900 dark:text-white" />
           </div>
        </div>
      );
  }
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, category, path, readonly, onClick, onEdit }) => {
  const getDisplayTitle = () => {
    if (profile.displayName) return profile.displayName;
    
    if (profile.platform === 'website') {
      return profile.username.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
    
    if (profile.platform === 'google-maps') {
      try {
        if (profile.username.includes('/place/')) {
          const parts = profile.username.split('/place/')[1].split('/')[0];
          return decodeURIComponent(parts.replace(/\+/g, ' '));
        } else if (profile.username.includes('query=') || profile.username.includes('q=')) {
          const url = new URL(profile.username.startsWith('http') ? profile.username : `https://${profile.username}`);
          const q = url.searchParams.get('query') || url.searchParams.get('q');
          if (q) return decodeURIComponent(q.replace(/\+/g, ' '));
        }
      } catch (e) {}
      return "Google Maps Location";
    }

    return `@${profile.username}`;
  };

  const displayTitle = getDisplayTitle();

  return (
    <div 
      className="group relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all flex items-center gap-4"
    >
      {/* Decorative colored strip based on category */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" 
        style={{ backgroundColor: category?.color || '#cbd5e1' }}
      />

      <PlatformIcon platform={profile.platform} />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={profile.displayName || profile.username}>
          {displayTitle}
        </h3>
        
        {/* Breadcrumb Path - Replaces Platform Tag */}
        {path && (
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium truncate mt-0.5">
                {path}
            </p>
        )}
        
        {/* Optional: Notes Snippet */}
        {profile.notes && (
           <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate mt-1 italic opacity-80">
             {profile.notes}
           </p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onClick && onClick(profile)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors border border-gray-100 dark:border-slate-600"
          title="View Details"
        >
          <Icons.Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View</span>
        </button>

        {!readonly && onEdit && (
          <button 
            onClick={(e) => onEdit(e, profile)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg text-xs font-bold transition-colors border border-pink-100 dark:border-pink-900/10"
            title="Edit Profile"
          >
            <Icons.Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}
      </div>
    </div>
  );
};