import React from 'react';
import { Profile, Category, Platform } from '../types';
import { Icons } from './Icon';

interface ProfileCardProps {
  profile: Profile;
  category?: Category;
  path?: string; // New prop for breadcrumbs
  onClick: (profile: Profile) => void;
  onEdit: (e: React.MouseEvent, profile: Profile) => void;
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
          {/* Using Unicode Double-Struck Capital X which closely resembles the logo */}
          <span className="text-2xl font-bold leading-none mt-[-2px]">𝕏</span>
        </div>
      );
    case 'tiktok':
      return (
        <div className="w-12 h-12 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white shadow-sm border border-gray-800">
          <Icons.Video className="w-6 h-6" />
        </div>
      );
    case 'website':
      return (
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-white shadow-sm">
          <Icons.Globe className="w-6 h-6" />
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

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, category, path, onClick, onEdit }) => {
  // Use displayName if available, otherwise format the username/url
  const displayTitle = profile.displayName 
    ? profile.displayName 
    : (profile.platform === 'website' 
        ? profile.username.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] 
        : `@${profile.username}`);

  return (
    <div 
      onClick={() => onClick(profile)}
      className="group relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4"
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
        
        {/* Optional: Notes Snippet (Only if no path or very long? Let's keep both for now but smaller) */}
        {profile.notes && (
           <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate mt-1 italic opacity-80">
             {profile.notes}
           </p>
        )}
      </div>

      <button 
        onClick={(e) => onEdit(e, profile)}
        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
      >
        <Icons.MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
};