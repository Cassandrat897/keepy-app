import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, Profile, SortOption, PASTEL_COLORS, Platform } from './types';
import { Icons } from './components/Icon';
import { Modal } from './components/Modal';
import { ProfileCard } from './components/ProfileCard';

// --- CONFIGURATION ---
// Paste your logo URLs or Base64 strings inside the quotes below.
const BRANDING = {
  // The small icon/symbol (used if full logos aren't provided, or for favicon style usage)
  icon: "https://i.ibb.co/ccYGcz7f/logo-icon.png", 
  
  // Full logo for Light Mode (e.g., Dark text)
  logoLight: "https://i.ibb.co/5X7BwQkn/logo-full-darktext.png", 
  
  // Full logo for Dark Mode (e.g., White text)
  logoDark: "https://i.ibb.co/v4TcLNbr/logo-full-lighttext.png", 
};

// Initial Mock Data - Cleared as requested
const INITIAL_CATEGORIES: Category[] = [];

const INITIAL_PROFILES: Profile[] = [];

export default function App() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('keepy_auth') === 'true';
    }
    return false;
  });
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- App State ---
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('keepy_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('keepy_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => ({
        ...p,
        // Migration: Ensure platform exists and migrate twitter -> x
        platform: (p.platform === 'twitter' ? 'x' : p.platform) || 'instagram'
      }));
    }
    return INITIAL_PROFILES;
  });

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
       return localStorage.getItem('keepy_theme') === 'dark';
    }
    return false;
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  
  // Separate state for the picker in the modal to allow independent expansion
  const [pickerExpandedCategoryIds, setPickerExpandedCategoryIds] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting & Filtering State
  const [profileSort, setProfileSort] = useState<SortOption>('newest');
  const [categorySort, setCategorySort] = useState<SortOption>('a-z');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  // Modals
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false); // New state for mobile management
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null); // Track which profile is being edited

  // Category Editing State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Forms
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfileDisplayName, setNewProfileDisplayName] = useState('');
  const [newProfilePlatform, setNewProfilePlatform] = useState<Platform>('instagram');
  const [newProfileNotes, setNewProfileNotes] = useState('');
  const [newProfileCategory, setNewProfileCategory] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PASTEL_COLORS[0]);
  const [newCategoryParent, setNewCategoryParent] = useState<string>('');

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('keepy_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('keepy_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('keepy_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('keepy_theme', 'light');
    }
  }, [darkMode]);

  // --- Auth Handler ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCode === 'Keepy@26') {
      setIsAuthenticated(true);
      localStorage.setItem('keepy_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Incorrect access code');
      setLoginCode(''); // Clear input on error
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('keepy_auth');
  };

  // --- Helpers ---
  const toggleCategoryExpand = (id: string) => {
    setExpandedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const togglePickerExpand = (id: string) => {
    setPickerExpandedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const sortCategories = (cats: Category[]) => {
    return [...cats].sort((a, b) => {
      if (categorySort === 'a-z') return a.name.localeCompare(b.name);
      if (categorySort === 'z-a') return b.name.localeCompare(a.name);
      // Using ID as proxy for creation time since IDs are Date.now() or sequential
      if (categorySort === 'newest') return b.id.localeCompare(a.id);
      if (categorySort === 'oldest') return a.id.localeCompare(b.id);
      return 0;
    });
  };

  const getProfileLink = (profile: Profile) => {
    // If username is a full URL (happens for website or complex share links), use it
    if (profile.username.startsWith('http')) return profile.username;

    switch (profile.platform) {
      case 'instagram': return `https://instagram.com/${profile.username}`;
      case 'facebook': return `https://facebook.com/${profile.username}`;
      case 'x': return `https://x.com/${profile.username}`;
      case 'tiktok': return `https://tiktok.com/@${profile.username.replace('@', '')}`;
      case 'website': return profile.username.startsWith('http') ? profile.username : `https://${profile.username}`;
      default: return '#';
    }
  };

  const cleanInputForPlatform = (input: string, platform: Platform): string => {
    let clean = input.trim();
    if (platform === 'website') return clean; // Keep websites as is

    // Handle pasted Full URLs
    if (clean.startsWith('http')) {
      // Facebook Special Handling for Share Links
      if (platform === 'facebook' && clean.includes('facebook.com/')) {
         const afterDomain = clean.split('facebook.com/')[1];
         // If it's a share link or profile.php, we need to be careful not to strip too much
         if (afterDomain.startsWith('share') || afterDomain.startsWith('profile.php')) {
             if (afterDomain.startsWith('profile.php')) return afterDomain; // Keep query params for profile.php
             return afterDomain.split('?')[0]; // Strip tracking params from share links usually
         }
      }

      // Generic cleanup (Strip domain and get first segment)
      if (clean.includes('instagram.com/')) clean = clean.split('instagram.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('facebook.com/')) clean = clean.split('facebook.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('twitter.com/')) clean = clean.split('twitter.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('x.com/')) clean = clean.split('x.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('tiktok.com/@')) clean = clean.split('tiktok.com/@')[1].split('/')[0].split('?')[0];
      else if (clean.includes('tiktok.com/')) clean = clean.split('tiktok.com/')[1].split('/')[0].split('?')[0];
    }

    return clean.replace('@', '');
  };

  // Auto-detect platform from pasted URL
  const handleProfileInput = (value: string) => {
    setNewProfileUsername(value);
    
    // Simple heuristics
    if (value.includes('instagram.com')) setNewProfilePlatform('instagram');
    else if (value.includes('facebook.com')) setNewProfilePlatform('facebook');
    else if (value.includes('twitter.com') || value.includes('x.com')) setNewProfilePlatform('x');
    else if (value.includes('tiktok.com')) setNewProfilePlatform('tiktok');
  };

  // --- Computed ---
  const filteredProfiles = useMemo(() => {
    let result = profiles.filter(p => {
       const searchLower = searchQuery.toLowerCase();
       const matchesSearch = p.username.toLowerCase().includes(searchLower) || 
                             p.notes.toLowerCase().includes(searchLower) ||
                             (p.displayName && p.displayName.toLowerCase().includes(searchLower));
       
       let matchesCategory = true;
       if (selectedCategoryId) {
          // Include direct children and subcategory children
          const subCategoryIds = categories
            .filter(c => c.parentId === selectedCategoryId)
            .map(c => c.id);
          
          matchesCategory = p.categoryId === selectedCategoryId || subCategoryIds.includes(p.categoryId);
       }

       let matchesPlatform = true;
       if (platformFilter !== 'all') {
         matchesPlatform = p.platform === platformFilter;
       }

       return matchesSearch && matchesCategory && matchesPlatform;
    });

    return result.sort((a, b) => {
      // Use display name for sorting if available, fallback to username
      const nameA = a.displayName || a.username;
      const nameB = b.displayName || b.username;

      if (profileSort === 'a-z') return nameA.localeCompare(nameB);
      if (profileSort === 'z-a') return nameB.localeCompare(nameA);
      if (profileSort === 'newest') return b.createdAt - a.createdAt;
      if (profileSort === 'oldest') return a.createdAt - b.createdAt;
      return 0;
    });
  }, [profiles, searchQuery, selectedCategoryId, categories, profileSort, platformFilter]);

  // Process categories for display (sorted root, sorted sub)
  const displayCategories = useMemo(() => {
    const root = categories.filter(c => !c.parentId);
    const sortedRoot = sortCategories(root);
    
    return sortedRoot.map(cat => ({
      ...cat,
      children: sortCategories(categories.filter(sub => sub.parentId === cat.id))
    }));
  }, [categories, categorySort]);

  // --- Derived State for Mobile Filters ---
  // 1. Determine the active parent ID based on selectedCategoryId
  const derivedParentId = useMemo(() => {
      if (!selectedCategoryId) return '';
      const cat = categories.find(c => c.id === selectedCategoryId);
      if (!cat) return '';
      return cat.parentId || cat.id;
  }, [selectedCategoryId, categories]);

  // 2. Get subcategories for the active parent to populate the secondary filter
  const subCategoriesForFilter = useMemo(() => {
      if (!derivedParentId) return [];
      const parent = displayCategories.find(c => c.id === derivedParentId);
      return parent ? parent.children : [];
  }, [derivedParentId, displayCategories]);

  // --- Handlers ---
  const handleSaveProfile = () => {
    if (!newProfileUsername || !newProfileCategory) return;
    
    const cleanUser = cleanInputForPlatform(newProfileUsername, newProfilePlatform);

    if (editingProfileId) {
       // Update Existing Profile
       setProfiles(prev => prev.map(p => 
         p.id === editingProfileId ? {
           ...p,
           username: cleanUser,
           displayName: newProfileDisplayName,
           platform: newProfilePlatform,
           categoryId: newProfileCategory,
           notes: newProfileNotes,
           // Keep createdAt
         } : p
       ));
    } else {
       // Create New Profile
       const newProfile: Profile = {
         id: Date.now().toString(),
         username: cleanUser,
         displayName: newProfileDisplayName,
         platform: newProfilePlatform,
         categoryId: newProfileCategory,
         notes: newProfileNotes,
         createdAt: Date.now(),
       };
       setProfiles([newProfile, ...profiles]);
    }

    setIsAddProfileOpen(false);
    resetProfileForm();
  };

  const handleStartEdit = (profile: Profile) => {
    setNewProfileUsername(profile.username);
    setNewProfileDisplayName(profile.displayName || '');
    setNewProfilePlatform(profile.platform);
    setNewProfileCategory(profile.categoryId);
    setNewProfileNotes(profile.notes);
    setEditingProfileId(profile.id);
    
    // Auto-expand the category if it's a subcategory so the user sees it selected
    const cat = categories.find(c => c.id === profile.categoryId);
    if (cat && cat.parentId) {
      if (!pickerExpandedCategoryIds.includes(cat.parentId)) {
        setPickerExpandedCategoryIds(prev => [...prev, cat.parentId!]);
      }
    }

    setIsPreviewOpen(false); // Close preview if open
    setIsAddProfileOpen(true); // Open form
  };

  const resetProfileForm = () => {
    setNewProfileUsername('');
    setNewProfileDisplayName('');
    setNewProfileNotes('');
    setNewProfileCategory('');
    setNewProfilePlatform('instagram');
    setEditingProfileId(null);
    setPickerExpandedCategoryIds([]);
  };

  // --- Category Management Handlers ---

  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
        setEditingCategoryId(category.id);
        setNewCategoryName(category.name);
        setNewCategoryColor(category.color);
        setNewCategoryParent(category.parentId || '');
    } else {
        setEditingCategoryId(null);
        setNewCategoryName('');
        setNewCategoryColor(PASTEL_COLORS[0]);
        setNewCategoryParent('');
    }
    setIsAddCategoryOpen(true);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName) return;

    let colorToUse = newCategoryColor;

    // RULE: If it's a subcategory, it MUST inherit color from parent
    if (newCategoryParent) {
        const parent = categories.find(c => c.id === newCategoryParent);
        if (parent) {
            colorToUse = parent.color;
        }
    }

    if (editingCategoryId) {
        // Update Existing Category
        const updatedCategories = categories.map(c => {
            if (c.id === editingCategoryId) {
                return { 
                    ...c, 
                    name: newCategoryName, 
                    color: colorToUse, 
                    parentId: newCategoryParent || undefined 
                };
            }
            return c;
        });
        
        // RULE: If this category is a parent, we must check if its color changed and update all children
        // Simpler approach: Just force update all children of this category to match the new color
        const finalCategories = updatedCategories.map(c => {
            if (c.parentId === editingCategoryId) {
                return { ...c, color: colorToUse };
            }
            return c;
        });

        setCategories(finalCategories);
    } else {
        // Create New Category
        const newCategory: Category = {
            id: Date.now().toString(),
            name: newCategoryName,
            color: colorToUse,
            parentId: newCategoryParent || undefined,
        };
        setCategories([...categories, newCategory]);
        
        // Auto-expand parent if subcategory
        if (newCategoryParent) {
            if (!expandedCategoryIds.includes(newCategoryParent)) {
                setExpandedCategoryIds([...expandedCategoryIds, newCategoryParent]);
            }
            if (!pickerExpandedCategoryIds.includes(newCategoryParent)) {
                setPickerExpandedCategoryIds([...pickerExpandedCategoryIds, newCategoryParent]);
            }
        }
    }

    setIsAddCategoryOpen(false);
    setNewCategoryName('');
    setNewCategoryParent('');
    setEditingCategoryId(null);
  };

  const handleDeleteProfile = (id: string) => {
    if (window.confirm("Are you sure you want to delete this profile?")) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      setIsPreviewOpen(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const hasChildren = categories.some(c => c.parentId === id);
    const message = hasChildren 
       ? "Are you sure? This will delete the category and all its subcategories. Profiles will be uncategorized."
       : "Are you sure you want to delete this category? Profiles will be uncategorized.";

    if (!window.confirm(message)) {
      return;
    }

    // Identify IDs to remove (parent + children)
    const childrenIds = categories.filter(c => c.parentId === id).map(c => c.id);
    const idsToDelete = [id, ...childrenIds];

    // Remove categories
    setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));

    // Reset selection if the currently selected category is deleted
    if (selectedCategoryId && idsToDelete.includes(selectedCategoryId)) {
      setSelectedCategoryId(null);
    }

    // Uncategorize profiles that were in these categories
    setProfiles(prev => prev.map(p => 
       idsToDelete.includes(p.categoryId) ? { ...p, categoryId: '' } : p
    ));
  };

  const handleOpenPreview = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsPreviewOpen(true);
  };

  const handleShare = async () => {
    const title = selectedCategoryId ? getCategoryName(selectedCategoryId) : 'All Profiles';
    let text = `📂 ${title} \n(Shared via Keepy)\n\n`;

    // Filter profiles by current platform filter as well
    const profilesToShare = filteredProfiles; // Uses current view state

    // Helper to group by category for the text output
    const groupByCat: Record<string, Profile[]> = {};
    profilesToShare.forEach(p => {
      const catId = p.categoryId;
      if (!groupByCat[catId]) groupByCat[catId] = [];
      groupByCat[catId].push(p);
    });

    const categoriesToPrint = [...categories].sort((a,b) => a.name.localeCompare(b.name));
    
    // Helper to format line
    const formatLine = (p: Profile) => {
      const link = getProfileLink(p);
      const label = p.platform === 'website' ? 'Web' : p.platform === 'x' ? 'X' : p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
      const name = p.displayName || p.username;
      return `• [${label}] ${name}: ${link}`;
    };

    // 1. Uncategorized (if any in current filter)
    const uncategorized = profilesToShare.filter(p => !p.categoryId);
    if (uncategorized.length > 0) {
      text += `Uncategorized:\n`;
      uncategorized.forEach(p => text += `${formatLine(p)}\n`);
      text += '\n';
    }

    // 2. Categories
    categoriesToPrint.forEach(cat => {
      // Check if this category has profiles in our filtered list
      const catProfiles = profilesToShare.filter(p => p.categoryId === cat.id);
      if (catProfiles.length > 0) {
        text += `${cat.name}:\n`;
        catProfiles.forEach(p => text += `${formatLine(p)}\n`);
        text += '\n';
      }
    });
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Keepy List: ${title}`,
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        alert('List copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing', error);
    }
  };
  
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Uncategorized';
  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#e2e8f0';

  // Render Helpers
  const renderLogo = () => {
    // 1. Try to use Full Logos if available
    const fullLogo = darkMode ? BRANDING.logoDark : BRANDING.logoLight;
    if (fullLogo) {
      return <img src={fullLogo} alt="Keepy" className="h-8 w-auto object-contain" />;
    }

    // 2. Fallback to Icon + Text
    return (
      <div className="flex items-center gap-2">
         {BRANDING.icon ? (
           <img src={BRANDING.icon} alt="Icon" className="w-8 h-8 object-contain" />
         ) : (
           <Icons.Instagram className="text-pink-500 w-8 h-8" />
         )}
         <span className={`text-2xl font-bold ${BRANDING.icon ? 'text-gray-900 dark:text-white' : 'bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500'}`}>
           Keepy
         </span>
      </div>
    );
  };

  const PLATFORMS: { id: Platform, label: string, icon: React.ReactNode }[] = [
    { id: 'instagram', label: 'Instagram', icon: <Icons.Instagram className="w-4 h-4" /> },
    { id: 'facebook', label: 'Facebook', icon: <Icons.Facebook className="w-4 h-4" /> },
    { id: 'x', label: 'X', icon: <span className="text-sm font-bold">𝕏</span> },
    { id: 'tiktok', label: 'TikTok', icon: <Icons.Video className="w-4 h-4" /> },
    { id: 'website', label: 'Website', icon: <Icons.Globe className="w-4 h-4" /> },
  ];

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-slate-700 text-center animate-in fade-in zoom-in duration-300">
           {/* Logo Section */}
           <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 border border-gray-100 dark:border-slate-700 p-3">
                 <img src={BRANDING.icon} alt="Keepy" className="w-full h-full object-contain" />
              </div>
           </div>
           
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Keepy</h1>
           <p className="text-gray-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
             Securely organize your digital life. <br/> Enter your access code to continue.
           </p>
           
           <form onSubmit={handleLogin} className="space-y-4">
             <div className="relative group">
                <input 
                  type="password"
                  value={loginCode}
                  onChange={(e) => { setLoginCode(e.target.value); setLoginError(''); }}
                  placeholder="Access Code"
                  autoFocus
                  className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none transition-all text-center tracking-widest text-lg font-bold text-gray-900 dark:text-white group-hover:border-pink-300 dark:group-hover:border-slate-600 placeholder-gray-400 dark:placeholder-slate-600"
                />
                {loginError && (
                  <div className="absolute -bottom-6 left-0 right-0">
                    <p className="text-red-500 text-xs font-medium animate-pulse">{loginError}</p>
                  </div>
                )}
             </div>
             
             <button 
               type="submit"
               className="w-full py-4 mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-xl shadow-gray-200/50 dark:shadow-none hover:opacity-90 hover:scale-[1.02] transition-all active:scale-95"
             >
               Unlock App
             </button>
           </form>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 h-20 flex items-center">
          {renderLogo()}
        </div>
        
        <div className="px-4 py-2 space-y-2">
          <button 
            onClick={() => handleOpenCategoryModal()}
            className="w-full py-2 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-pink-400 hover:text-pink-500 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
          >
            <Icons.Plus className="w-4 h-4" /> New Category
          </button>
          
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg p-1.5">
             <Icons.ArrowUpDown className="w-4 h-4 text-gray-400 ml-2" />
             <select 
               value={categorySort}
               onChange={(e) => setCategorySort(e.target.value as SortOption)}
               className="bg-transparent text-xs font-medium text-gray-600 dark:text-gray-300 w-full focus:outline-none cursor-pointer border-none p-0 pr-2"
             >
               <option value="a-z">Name (A-Z)</option>
               <option value="z-a">Name (Z-A)</option>
               <option value="newest">Newest</option>
               <option value="oldest">Oldest</option>
             </select>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div 
             onClick={() => setSelectedCategoryId(null)}
             className={`w-full flex items-center rounded-xl cursor-pointer transition-colors ${
              selectedCategoryId === null 
                ? 'bg-gray-100 dark:bg-slate-800' 
                : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="w-8 flex-shrink-0"></div>
            <div className="flex-1 flex items-center gap-3 py-3 pr-4">
              <Icons.FolderOpen className="w-5 h-5 text-gray-500" />
              <span className={`font-semibold ${selectedCategoryId === null ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'}`}>
                All Profiles
              </span>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 px-2 text-gray-400 dark:text-slate-500 text-sm leading-relaxed animate-in fade-in zoom-in duration-300">
               <p className="text-2xl mb-2">🫧</p>
               <p>You have no categories saved yet.</p>
               <p className="mt-1">Please press <strong className="font-semibold text-gray-600 dark:text-slate-300">New Category</strong> to add one.</p>
            </div>
          ) : (
             displayCategories.map(cat => (
              <div key={cat.id} className="space-y-1">
                 <div className={`group flex items-center rounded-xl transition-colors pr-2 ${
                    selectedCategoryId === cat.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                 }`}>
                   <div className="w-8 flex justify-center flex-shrink-0">
                      {cat.children.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleCategoryExpand(cat.id); }}
                          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-colors"
                        >
                           {expandedCategoryIds.includes(cat.id) 
                             ? <Icons.ChevronDown className="w-4 h-4" /> 
                             : <Icons.ChevronRight className="w-4 h-4" />
                           }
                        </button>
                      )}
                   </div>

                   <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex-1 flex items-center gap-3 py-2.5 text-left ${
                      selectedCategoryId === cat.id 
                        ? 'font-semibold text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(cat); }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit Category"
                      >
                          <Icons.Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                         className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                         title="Delete Category"
                      >
                         <Icons.Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                 </div>
                
                {/* Subcategories */}
                {expandedCategoryIds.includes(cat.id) && (
                    <div className="space-y-1">
                      {cat.children.map(sub => (
                         <div key={sub.id} className={`group flex items-center pr-2 rounded-xl transition-colors pl-8 ${
                              selectedCategoryId === sub.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          }`}>
                              <button
                                onClick={() => setSelectedCategoryId(sub.id)}
                                className={`flex-1 flex items-center gap-3 py-2 text-left text-sm ${
                                  selectedCategoryId === sub.id 
                                    ? 'text-gray-900 dark:text-white font-medium' 
                                    : 'text-gray-500 dark:text-slate-500'
                                }`}
                              >
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }}></div>
                                <span className="truncate">{sub.name}</span>
                              </button>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(sub); }}
                                    className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                    title="Edit Subcategory"
                                  >
                                      <Icons.Edit2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteCategory(sub.id); }}
                                     className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                     title="Delete Subcategory"
                                  >
                                     <Icons.Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
            ))
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="flex items-center gap-3 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors w-full px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
           >
             {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
             <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
           </button>
           <button 
             onClick={handleLogout}
             className="flex items-center gap-3 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors w-full px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
           >
             <Icons.Lock className="w-5 h-5" />
             <span>Lock App</span>
           </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col h-full bg-white/50 dark:bg-black/20 overflow-x-hidden min-w-0">
        {/* Mobile Header - Added safe area padding */}
        <div className="md:hidden flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {renderLogo()}
          </div>
          <div className="flex items-center gap-3">
             {/* New Mobile Manage Categories Button */}
             <button 
               onClick={() => setIsManageCategoriesOpen(true)}
               className="p-2 text-gray-500 dark:text-slate-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
               title="Manage Categories"
             >
               <Icons.FolderOpen className="w-6 h-6" />
             </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              {darkMode ? <Icons.Sun className="w-6 h-6" /> : <Icons.Moon className="w-6 h-6" />}
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              <Icons.Lock className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <header className="p-4 md:p-8 pb-0 max-w-7xl mx-auto w-full">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
                  <span className="truncate max-w-full">
                    {selectedCategoryId ? getCategoryName(selectedCategoryId) : 'All Profiles'}
                  </span>
                  {selectedCategoryId && (
                    <span className="text-sm font-normal px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 flex-shrink-0">
                       {filteredProfiles.length}
                    </span>
                  )}
                  <button 
                    onClick={handleShare}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-pink-500 transition-colors flex-shrink-0"
                    title="Share this list"
                  >
                    <Icons.Share2 className="w-5 h-5" />
                  </button>
                </h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1 truncate">
                  {selectedCategoryId 
                    ? `Manage your ${getCategoryName(selectedCategoryId)} collection` 
                    : 'Your entire collection in one place'}
                </p>
              </div>
              <button 
                onClick={() => { resetProfileForm(); setIsAddProfileOpen(true); }}
                className="w-full md:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-6 py-3 rounded-xl font-semibold shadow-lg shadow-gray-200/50 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0"
              >
                <Icons.Plus className="w-5 h-5" />
                Add Profile
              </button>
           </div>

           {/* Filters */}
           <div className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="relative flex-1 w-full">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 min-w-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="h-6 w-[1px] bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
              
              {/* Platform Filter */}
              <div className="flex items-center gap-2 px-2 border-r border-gray-200 dark:border-slate-700 hidden sm:flex">
                 <Icons.Filter className="w-4 h-4 text-gray-400" />
                 <select
                   value={platformFilter}
                   onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
                   className="bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none cursor-pointer border-none p-0 pr-2"
                 >
                   <option value="all">All Platforms</option>
                   <option value="instagram">Instagram</option>
                   <option value="facebook">Facebook</option>
                   <option value="x">X</option>
                   <option value="tiktok">TikTok</option>
                   <option value="website">Websites</option>
                 </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar min-w-0">
                 {/* Mobile Category Selects - Split into Parent and Subcategory */}
                 <select 
                    className="md:hidden bg-gray-50 dark:bg-slate-700 border-none rounded-lg text-sm px-3 py-2 flex-1 min-w-[140px]"
                    onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                    value={derivedParentId}
                 >
                    <option value="">All Categories</option>
                    {displayCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>

                 {/* Secondary Filter: Only appears if a parent is selected and has children */}
                 {derivedParentId && subCategoriesForFilter.length > 0 && (
                     <select 
                        className="md:hidden bg-gray-50 dark:bg-slate-700 border-none rounded-lg text-sm px-3 py-2 flex-1 min-w-[140px] animate-in fade-in slide-in-from-left-2"
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        value={selectedCategoryId || ''}
                     >
                        <option value={derivedParentId}>
                            All {categories.find(c => c.id === derivedParentId)?.name}
                        </option>
                        {subCategoriesForFilter.map(sub => (
                           <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                     </select>
                 )}
                 
                 <select
                   value={platformFilter}
                   onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
                   className="md:hidden bg-gray-50 dark:bg-slate-700 border-none rounded-lg text-sm px-3 py-2 flex-1"
                 >
                   <option value="all">All Platforms</option>
                   <option value="instagram">Instagram</option>
                   <option value="facebook">Facebook</option>
                   <option value="x">X</option>
                   <option value="tiktok">TikTok</option>
                   <option value="website">Web</option>
                 </select>

                 <div className="flex items-center gap-2 px-2 flex-shrink-0">
                   <Icons.ArrowUpDown className="w-4 h-4 text-gray-400" />
                   <select 
                      className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 cursor-pointer focus:ring-0"
                      value={profileSort}
                      onChange={(e) => setProfileSort(e.target.value as SortOption)}
                   >
                     <option value="newest">Newest</option>
                     <option value="oldest">Oldest</option>
                     <option value="a-z">Name (A-Z)</option>
                     <option value="z-a">Name (Z-A)</option>
                   </select>
                 </div>
              </div>
           </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-7xl mx-auto">
             {filteredProfiles.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                 {profiles.length === 0 ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="text-6xl mb-4">🫧</div>
                      <h3 className="text-xl font-medium text-gray-900 dark:text-white">You have no profiles saved yet</h3>
                      <p className="text-sm mt-2 text-gray-500 dark:text-slate-400">Please press <strong>+ Add Profile</strong> to add one</p>
                    </div>
                 ) : (
                    <>
                     <div className="bg-gray-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Search className="w-10 h-10 text-gray-400" />
                     </div>
                     <h3 className="text-lg font-medium">No profiles found</h3>
                     <p className="text-sm">Try adding one or changing filters</p>
                    </>
                 )}
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredProfiles.map(profile => (
                   <ProfileCard 
                     key={profile.id} 
                     profile={profile} 
                     category={categories.find(c => c.id === profile.categoryId)}
                     onClick={handleOpenPreview}
                     onEdit={(e, p) => { e.stopPropagation(); handleStartEdit(p); }}
                   />
                 ))}
               </div>
             )}
           </div>
        </div>
      </main>

      {/* --- Modals --- */}
      
      {/* Add/Edit Profile Modal */}
      <Modal 
        isOpen={isAddProfileOpen} 
        onClose={() => { setIsAddProfileOpen(false); resetProfileForm(); }} 
        title={editingProfileId ? "Edit Profile" : "Add Profile"}
      >
         <div className="space-y-4">
           
           {/* Platform Selector */}
           <div>
             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Platform</label>
             <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
               {PLATFORMS.map(p => (
                 <button
                   key={p.id}
                   onClick={() => setNewProfilePlatform(p.id)}
                   className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                     newProfilePlatform === p.id
                       ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300'
                       : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300'
                   }`}
                 >
                   {p.icon}
                   <span className="text-[10px] mt-1 font-medium">{p.label}</span>
                 </button>
               ))}
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Display Name (Optional)
             </label>
             <input 
               type="text" 
               className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
               placeholder="e.g. My Friend, Cool Shop"
               value={newProfileDisplayName}
               onChange={(e) => setNewProfileDisplayName(e.target.value)}
             />
           </div>

           <div>
             <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {newProfilePlatform === 'website' ? 'Website URL' : 'Username or Profile URL'}
             </label>
             <div className="relative">
                {newProfilePlatform !== 'website' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">@</span>
                )}
                <input 
                  type="text" 
                  className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all ${newProfilePlatform !== 'website' ? 'pl-8' : ''}`}
                  placeholder={newProfilePlatform === 'website' ? 'https://example.com' : 'username'}
                  value={newProfileUsername}
                  onChange={(e) => handleProfileInput(e.target.value)}
                />
             </div>
             {newProfilePlatform !== 'website' && (
               <p className="text-xs text-gray-400 mt-1 ml-1">Paste a full URL to auto-detect platform</p>
             )}
           </div>
           
           <div>
             <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
             <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {displayCategories.map(cat => (
                  <React.Fragment key={cat.id}>
                      <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 ${
                         newProfileCategory === cat.id 
                         ? 'border-pink-500 ring-1 ring-pink-500 bg-pink-50 dark:bg-pink-900/20' 
                         : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                      }`}>
                          {cat.children.length > 0 ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); togglePickerExpand(cat.id); }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                               {pickerExpandedCategoryIds.includes(cat.id) 
                                  ? <Icons.ChevronDown className="w-4 h-4"/> 
                                  : <Icons.ChevronRight className="w-4 h-4"/>
                               }
                            </button>
                          ) : (
                            <div className="w-6 flex-shrink-0" />
                          )}
                          
                          <div 
                             className="flex-1 flex items-center gap-2 cursor-pointer"
                             onClick={() => setNewProfileCategory(cat.id)}
                          >
                             <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                             <span className={`font-medium text-sm ${newProfileCategory === cat.id ? 'text-pink-700 dark:text-pink-300' : ''}`}>
                                {cat.name}
                             </span>
                          </div>
                      </div>

                      {/* Subcategories (Collapsible) */}
                      {pickerExpandedCategoryIds.includes(cat.id) && cat.children.map(sub => (
                         <div 
                           key={sub.id}
                           className={`ml-8 flex items-center gap-2 p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 cursor-pointer ${
                              newProfileCategory === sub.id
                              ? 'border-pink-500 ring-1 ring-pink-500 bg-pink-50 dark:bg-pink-900/20' 
                              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                           }`}
                           onClick={() => setNewProfileCategory(sub.id)}
                         >
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }}></div>
                            <span className={`text-sm ${newProfileCategory === sub.id ? 'text-pink-700 dark:text-pink-300 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                               {sub.name}
                            </span>
                         </div>
                      ))}
                  </React.Fragment>
                ))}

                <button 
                  onClick={() => { setIsAddProfileOpen(false); setIsAddCategoryOpen(true); }}
                  className="p-2 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 hover:text-pink-500 hover:border-pink-400 flex items-center justify-center gap-1 text-sm h-full min-h-[42px] mt-1"
                >
                  <Icons.Plus className="w-3 h-3" /> New Category
                </button>
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes</label>
             <textarea 
               className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all h-24 resize-none"
               placeholder="Why do you follow them? What do you like?"
               value={newProfileNotes}
               onChange={(e) => setNewProfileNotes(e.target.value)}
             />
           </div>

           <button 
             onClick={handleSaveProfile}
             disabled={!newProfileUsername || !newProfileCategory}
             className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
           >
             {editingProfileId ? "Update Profile" : "Save Profile"}
           </button>
         </div>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal 
        isOpen={isAddCategoryOpen} 
        onClose={() => { setIsAddCategoryOpen(false); setEditingCategoryId(null); }} 
        title={editingCategoryId ? "Edit Category" : "New Category"}
      >
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category Name</label>
               <input 
                  type="text" 
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="e.g. Travel, Art, Fitness"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
             </div>

             {/* Color Picker: Only show if it's a Top Level Category (no parent selected) */}
             {!newCategoryParent ? (
                 <div>
                   <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Color {editingCategoryId && categories.some(c => c.parentId === editingCategoryId) && <span className="text-xs font-normal text-gray-500 ml-1">(Updates all subcategories)</span>}
                   </label>
                   <div className="flex flex-wrap gap-3 mb-3 items-center">
                     {PASTEL_COLORS.map(color => (
                       <button
                         key={color}
                         onClick={() => setNewCategoryColor(color)}
                         className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${newCategoryColor === color ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-gray-200 dark:ring-slate-700' : 'border-transparent'}`}
                         style={{ backgroundColor: color }}
                       />
                     ))}
                     
                     <div 
                       className="relative w-9 h-9 overflow-hidden rounded-full border-2 border-gray-200 dark:border-slate-700 group cursor-pointer shadow-sm hover:scale-110 transition-transform"
                       style={{ background: 'conic-gradient(from 180deg, #FFB3BA, #FFDFBA, #FFFFBA, #BAFFC9, #BAE1FF, #E2BAFF, #C9C9FF, #FFB3BA)' }}
                       title="Custom Color"
                     >
                        <input 
                          type="color" 
                          className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 opacity-0 cursor-pointer"
                          value={newCategoryColor}
                          onChange={(e) => setNewCategoryColor(e.target.value)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           {!PASTEL_COLORS.includes(newCategoryColor) && (
                              <div className="w-2 h-2 bg-white rounded-full shadow-md"></div>
                           )}
                        </div>
                     </div>
                   </div>
                 </div>
             ) : (
                // Message when color is inherited
                <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600" style={{ backgroundColor: categories.find(c => c.id === newCategoryParent)?.color }}></div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                        Color inherited from <strong>{categories.find(c => c.id === newCategoryParent)?.name}</strong>
                    </div>
                </div>
             )}

             <div>
               <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Parent Category (Optional)</label>
               <select 
                 className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                 value={newCategoryParent}
                 onChange={(e) => setNewCategoryParent(e.target.value)}
                 disabled={!!editingCategoryId && categories.some(c => c.parentId === editingCategoryId)} // Disable parent change if this category has children itself (prevent deep nesting issues for simplicity)
               >
                 <option value="">None (Top Level)</option>
                 {displayCategories
                   .filter(c => c.id !== editingCategoryId) // Prevent selecting self as parent
                   .map(c => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>
               {editingCategoryId && categories.some(c => c.parentId === editingCategoryId) && (
                   <p className="text-xs text-gray-400 mt-1">Cannot change parent because this category has its own subcategories.</p>
               )}
             </div>

             <button 
               onClick={handleSaveCategory}
               disabled={!newCategoryName}
               className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-all"
             >
               {editingCategoryId ? 'Update Category' : 'Create Category'}
             </button>
          </div>
      </Modal>
      
      {/* Full Page Mobile Category Manager (Replaces Modal) */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
           {/* Header with Safe Area Padding */}
           <div className="pt-[max(16px,env(safe-area-inset-top))] px-4 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
              <button 
                onClick={() => setIsManageCategoriesOpen(false)}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                 <Icons.ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Categories</h2>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <button 
                onClick={() => handleOpenCategoryModal()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-pink-400 hover:text-pink-500 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Icons.Plus className="w-5 h-5" /> Add New Category
              </button>
              
              <div className="space-y-2">
                 {categories.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                       <p>No categories yet.</p>
                       <p className="text-sm mt-1">Create one to get started!</p>
                    </div>
                 )}
                 {displayCategories.map(cat => (
                    <div key={cat.id} className="space-y-1">
                       <div className="flex items-center gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all">
                          {cat.children.length > 0 && (
                            <button onClick={() => toggleCategoryExpand(cat.id)} className="p-1 text-gray-400">
                               {expandedCategoryIds.includes(cat.id) ? <Icons.ChevronDown className="w-5 h-5"/> : <Icons.ChevronRight className="w-5 h-5"/>}
                            </button>
                          )}
                          <div className="flex-1 flex items-center gap-3">
                             <span className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: cat.color}}></span>
                             <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleOpenCategoryModal(cat)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              >
                                 <Icons.Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => handleDeleteCategory(cat.id)}
                                 className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                 <Icons.Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                       </div>
                       
                       {expandedCategoryIds.includes(cat.id) && (
                          <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-slate-800 space-y-1">
                             {cat.children.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                   <div className="flex-1 flex items-center gap-3">
                                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: sub.color}}></span>
                                      <span className="text-gray-700 dark:text-gray-300 font-medium">{sub.name}</span>
                                   </div>
                                   <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => handleOpenCategoryModal(sub)}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                      >
                                         <Icons.Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                         onClick={() => handleDeleteCategory(sub.id)}
                                         className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                      >
                                         <Icons.Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Profile Preview/Details Modal */}
      {selectedProfile && (
        <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Profile Details">
           <div className="flex flex-col items-center mb-6">
              <div className="mb-4">
                 {/* Re-use icon logic from ProfileCard logic but bigger */}
                 {(() => {
                    const platform = selectedProfile.platform;
                    if (platform === 'facebook') return <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center"><Icons.Facebook className="w-12 h-12 text-white" /></div>;
                    if (platform === 'x') return <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center"><span className="text-4xl font-bold text-white">𝕏</span></div>;
                    if (platform === 'tiktok') return <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center border border-gray-800"><Icons.Video className="w-12 h-12 text-white" /></div>;
                    if (platform === 'website') return <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center"><Icons.Globe className="w-12 h-12 text-white" /></div>;
                    return <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-1 flex items-center justify-center"><div className="w-full h-full bg-white dark:bg-slate-800 rounded-full flex items-center justify-center"><Icons.Instagram className="w-12 h-12 text-gray-900 dark:text-white" /></div></div>;
                 })()}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center break-all">
                {selectedProfile.displayName || (selectedProfile.platform === 'website' ? selectedProfile.username : `@${selectedProfile.username}`)}
              </h2>
              <div className="flex gap-2 items-center mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 dark:bg-slate-700 text-gray-500">
                  {selectedProfile.platform === 'x' ? 'X' : selectedProfile.platform}
                </span>
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: getCategoryColor(selectedProfile.categoryId) }}
                >
                  {getCategoryName(selectedProfile.categoryId)}
                </div>
              </div>
           </div>

           <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl mb-6">
             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
             <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
               {selectedProfile.notes || "No notes added yet."}
             </p>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <a 
                href={getProfileLink(selectedProfile)}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Icons.ExternalLink className="w-4 h-4" />
                Open {selectedProfile.platform === 'website' ? 'Link' : 'Profile'}
              </a>
              
              <button 
                className="py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                onClick={() => handleStartEdit(selectedProfile)}
              >
                <Icons.Edit2 className="w-4 h-4" /> Edit
              </button>

              <button 
                onClick={() => handleDeleteProfile(selectedProfile.id)}
                className="py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Icons.Trash2 className="w-4 h-4" /> Delete
              </button>
           </div>
           
           <div className="text-center mt-6">
             <p className="text-xs text-gray-400">
               Added {new Date(selectedProfile.createdAt).toLocaleDateString()}
             </p>
           </div>
        </Modal>
      )}

    </div>
  );
}