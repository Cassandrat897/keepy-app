import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, Profile, SortOption, PASTEL_COLORS, Platform, Folder } from './types';
import { Icons } from './components/Icon';
import { Modal } from './components/Modal';
import { ProfileCard } from './components/ProfileCard';

// --- CONFIGURATION ---
const APP_VERSION = '1.3.0'; // Enhanced Move Clarity

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
const INITIAL_FOLDERS: Folder[] = [];

// --- HELPER COMPONENT: Filter Pill ---
const FilterPill = ({ 
  icon: Icon, 
  label, 
  value, 
  onChange, 
  options, 
  isActive = false,
  variant = 'default' 
}: {
  icon: any,
  label: string,
  value: string,
  onChange: (val: string) => void,
  options: { value: string, label: string }[],
  isActive?: boolean,
  variant?: 'default' | 'highlight'
}) => {
  return (
    <div className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm transition-all cursor-pointer flex-shrink-0 group ${
      variant === 'highlight' 
        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
        : isActive 
          ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300'
          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-pink-300 dark:hover:border-slate-500'
    }`}>
      {/* Icon */}
      <Icon className={`w-4 h-4 ${isActive || variant === 'highlight' ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
      
      {/* Label Display */}
      <span className="text-xs font-semibold whitespace-nowrap pr-1">
        {options.find(o => o.value === value)?.label || label}
      </span>
      
      {/* Dropdown Indicator */}
      <Icons.ChevronDown className="w-3 h-3 opacity-40" />

      {/* Hidden Native Select for Functionality */}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

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
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('keepy_folders');
    return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
  });

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

  // Navigation / Filter State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Expansion State
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  
  // Separate state for the picker in the modal to allow independent expansion
  const [pickerExpandedCategoryIds, setPickerExpandedCategoryIds] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting & Filtering State
  const [profileSort, setProfileSort] = useState<SortOption>('newest');
  const [categorySort, setCategorySort] = useState<SortOption>('a-z');
  const [folderSort, setFolderSort] = useState<SortOption>('a-z');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  // Modals
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false); // Mobile Menu
  const [isManageFoldersOpen, setIsManageFoldersOpen] = useState(false); // New Folder Manager
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  // Custom Color State
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customHue, setCustomHue] = useState(0);

  // Inline Folder Creation State
  const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
  const [newInlineFolderName, setNewInlineFolderName] = useState('');
  
  // Editing Tracking
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // Forms
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfileDisplayName, setNewProfileDisplayName] = useState('');
  const [newProfilePlatform, setNewProfilePlatform] = useState<Platform>('instagram');
  const [newProfileNotes, setNewProfileNotes] = useState('');
  
  const [newProfileCategory, setNewProfileCategory] = useState('');
  const [newProfileFolderId, setNewProfileFolderId] = useState('');
  const [newProfileParentId, setNewProfileParentId] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PASTEL_COLORS[0]);
  const [newCategoryParent, setNewCategoryParent] = useState<string>('');
  const [newCategoryFolder, setNewCategoryFolder] = useState<string>('');

  const [newFolderName, setNewFolderName] = useState('');

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('keepy_folders', JSON.stringify(folders));
  }, [folders]);

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

  // --- Auto-Migration Effect ---
  useEffect(() => {
    const orphans = categories.filter(c => !c.parentId && !c.folderId);
    if (orphans.length > 0) {
        console.log(`Keepy: Auto-migrating ${orphans.length} orphan categories.`);
        let targetFolderId: string;
        let updatedFolders = [...folders];
        const existingGeneral = folders.find(f => f.name === 'General');
        if (existingGeneral) {
            targetFolderId = existingGeneral.id;
        } else {
            const newFolder = { id: Date.now().toString(), name: 'General' };
            updatedFolders.push(newFolder);
            targetFolderId = newFolder.id;
            setExpandedFolderIds(prev => [...prev, newFolder.id]); // Auto-expand
        }
        const updatedCategories = categories.map(c => {
            if (!c.parentId && !c.folderId) return { ...c, folderId: targetFolderId };
            return c;
        });
        setFolders(updatedFolders);
        setCategories(updatedCategories);
    }
  }, [categories, folders]);


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
  const toggleFolderExpand = (id: string) => {
    setExpandedFolderIds(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

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

  // Generic Sort Function
  const sortItems = <T extends { id: string, name: string, createdAt?: number, color?: string }>(items: T[], sortMode: SortOption) => {
    return [...items].sort((a, b) => {
      if (sortMode === 'a-z') return a.name.localeCompare(b.name);
      if (sortMode === 'z-a') return b.name.localeCompare(a.name);
      if (sortMode === 'newest') return b.id.localeCompare(a.id);
      if (sortMode === 'oldest') return a.id.localeCompare(b.id);
      if (sortMode === 'color' && a.color && b.color) return a.color.localeCompare(b.color);
      return 0;
    });
  };

  const getProfileLink = (profile: Profile) => {
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
  
  const getProfilePath = (profile: Profile): string => {
    const cat = categories.find(c => c.id === profile.categoryId);
    if (!cat) return '';

    const parts: string[] = [];
    let folderId = cat.folderId;
    if (cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent && parent.folderId) folderId = parent.folderId;
    }
    
    if (folderId) {
        const f = folders.find(fo => fo.id === folderId);
        if (f) parts.push(f.name);
    }
    if (cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent) parts.push(parent.name);
    }
    parts.push(cat.name);
    return parts.join(' › ');
  };

  const cleanInputForPlatform = (input: string, platform: Platform): string => {
    let clean = input.trim();
    if (platform === 'website') return clean;
    if (clean.startsWith('http')) {
      if (platform === 'facebook' && clean.includes('facebook.com/')) {
         const afterDomain = clean.split('facebook.com/')[1];
         if (afterDomain.startsWith('share') || afterDomain.startsWith('profile.php')) {
             if (afterDomain.startsWith('profile.php')) return afterDomain; 
             return afterDomain.split('?')[0]; 
         }
      }
      if (clean.includes('instagram.com/')) clean = clean.split('instagram.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('facebook.com/')) clean = clean.split('facebook.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('twitter.com/')) clean = clean.split('twitter.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('x.com/')) clean = clean.split('x.com/')[1].split('/')[0].split('?')[0];
      else if (clean.includes('tiktok.com/@')) clean = clean.split('tiktok.com/@')[1].split('/')[0].split('?')[0];
      else if (clean.includes('tiktok.com/')) clean = clean.split('tiktok.com/')[1].split('/')[0].split('?')[0];
    }
    return clean.replace('@', '');
  };

  const handleProfileInput = (value: string) => {
    setNewProfileUsername(value);
    if (value.includes('instagram.com')) setNewProfilePlatform('instagram');
    else if (value.includes('facebook.com')) setNewProfilePlatform('facebook');
    else if (value.includes('twitter.com') || value.includes('x.com')) setNewProfilePlatform('x');
    else if (value.includes('tiktok.com')) setNewProfilePlatform('tiktok');
  };

  const handleExportData = () => {
    const data = { folders, categories, profiles, version: 2, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keepy_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (window.confirm("Restoring a backup will REPLACE your current data. This cannot be undone. Are you sure?")) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.categories && Array.isArray(json.categories) && json.profiles && Array.isArray(json.profiles)) {
           setCategories(json.categories);
           setProfiles(json.profiles);
           if (json.folders && Array.isArray(json.folders)) {
             setFolders(json.folders);
           }
           alert("Data restored successfully!");
           setIsManageCategoriesOpen(false);
        } else {
           alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error parsing backup file.");
        console.error(err);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Computed Data ---
  const displayTree = useMemo(() => {
    const rootCategories = categories.filter(c => !c.parentId);
    const sortedFolders = sortItems(folders, folderSort);
    const folderGroups = sortedFolders.map(folder => {
       const folderCats = rootCategories.filter(c => c.folderId === folder.id);
       return {
         ...folder,
         categories: sortItems(folderCats, categorySort).map(cat => ({
            ...cat,
            children: sortItems(categories.filter(sub => sub.parentId === cat.id), 'a-z')
         }))
       };
    });
    const unfiledCats = rootCategories.filter(c => !c.folderId);
    return {
      folders: folderGroups,
      unfiled: sortItems(unfiledCats, categorySort).map(cat => ({
        ...cat,
        children: sortItems(categories.filter(sub => sub.parentId === cat.id), 'a-z')
      }))
    };
  }, [categories, folders, categorySort, folderSort]);

  const activeParentId = useMemo(() => {
    if (!selectedCategoryId) return '';
    const cat = categories.find(c => c.id === selectedCategoryId);
    if (!cat) return '';
    return cat.parentId || cat.id; 
  }, [selectedCategoryId, categories]);

  const activeSubId = useMemo(() => {
      if (!selectedCategoryId) return '';
      const cat = categories.find(c => c.id === selectedCategoryId);
      if (!cat || !cat.parentId) return ''; 
      return cat.id;
  }, [selectedCategoryId, categories]);

  const dropdownParents = useMemo(() => {
      let parents = categories.filter(c => !c.parentId);
      if (selectedFolderId) {
          parents = parents.filter(c => c.folderId === selectedFolderId);
      }
      return sortItems(parents, 'a-z');
  }, [categories, selectedFolderId]);

  const dropdownSubs = useMemo(() => {
      if (!activeParentId) return [];
      const subs = categories.filter(c => c.parentId === activeParentId);
      return sortItems(subs, 'a-z');
  }, [categories, activeParentId]);

  const filteredProfiles = useMemo(() => {
    let result = profiles.filter(p => {
       const searchLower = searchQuery.toLowerCase();
       const matchesSearch = p.username.toLowerCase().includes(searchLower) || 
                             p.notes.toLowerCase().includes(searchLower) ||
                             (p.displayName && p.displayName.toLowerCase().includes(searchLower));
       if (!matchesSearch) return false;

       let matchesHierarchy = true;
       if (selectedCategoryId) {
          const subCategoryIds = categories.filter(c => c.parentId === selectedCategoryId).map(c => c.id);
          matchesHierarchy = p.categoryId === selectedCategoryId || subCategoryIds.includes(p.categoryId);
       } else if (selectedFolderId) {
          const folderCategoryIds = categories.filter(c => {
                 if (!c.parentId && c.folderId === selectedFolderId) return true;
                 if (c.parentId) {
                     const parent = categories.find(p => p.id === c.parentId);
                     return parent && parent.folderId === selectedFolderId;
                 }
                 return false;
             }).map(c => c.id);
           matchesHierarchy = folderCategoryIds.includes(p.categoryId);
       }
       
       let matchesPlatform = true;
       if (platformFilter !== 'all') matchesPlatform = p.platform === platformFilter;
       return matchesHierarchy && matchesPlatform;
    });

    return result.sort((a, b) => {
      if (profileSort === 'color') {
          const catA = categories.find(c => c.id === a.categoryId);
          const catB = categories.find(c => c.id === b.categoryId);
          const colorA = catA?.color || '';
          const colorB = catB?.color || '';
          if (colorA === colorB) return (a.displayName || a.username).localeCompare(b.displayName || b.username);
          return colorA.localeCompare(colorB);
      }
      const nameA = a.displayName || a.username;
      const nameB = b.displayName || b.username;
      if (profileSort === 'a-z') return nameA.localeCompare(nameB);
      if (profileSort === 'z-a') return nameB.localeCompare(nameA);
      if (profileSort === 'newest') return b.createdAt - a.createdAt;
      if (profileSort === 'oldest') return a.createdAt - b.createdAt;
      return 0;
    });
  }, [profiles, searchQuery, selectedCategoryId, selectedFolderId, categories, profileSort, platformFilter]);

  // --- CRUD Handlers ---
  const handleOpenFolderModal = (folder?: Folder) => {
     if (folder) {
        setEditingFolderId(folder.id);
        setNewFolderName(folder.name);
     } else {
        setEditingFolderId(null);
        setNewFolderName('');
     }
     setIsManageFoldersOpen(true);
  };

  const handleSaveFolder = () => {
     if (!newFolderName.trim()) return;
     if (editingFolderId) {
        setFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: newFolderName } : f));
     } else {
        // FIX: Use newFolderName instead of hardcoded 'General'
        const newFolder: Folder = { id: Date.now().toString(), name: newFolderName };
        setFolders(prev => [...prev, newFolder]);
        setExpandedFolderIds(prev => [...prev, newFolder.id]);
     }
     setIsManageFoldersOpen(false);
     setNewFolderName('');
     setEditingFolderId(null);
  };

  const handleSaveInlineFolder = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!newInlineFolderName.trim()) return;
      const newFolder: Folder = { id: Date.now().toString(), name: newInlineFolderName.trim() };
      setFolders(prev => [...prev, newFolder]);
      setExpandedFolderIds(prev => [...prev, newFolder.id]);
      setNewCategoryFolder(newFolder.id); // Auto select
      setNewInlineFolderName('');
      setIsCreatingFolderInline(false);
  };

  const handleDeleteFolder = (id: string) => {
     if(window.confirm("Delete this folder? Categories inside will be 'Unfiled'.")) {
        setFolders(prev => prev.filter(f => f.id !== id));
        setCategories(prev => prev.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
        if (selectedFolderId === id) setSelectedFolderId(null);
     }
  };

  const handleSaveProfile = () => {
    if (!newProfileUsername || !newProfileCategory) return;
    const cleanUser = cleanInputForPlatform(newProfileUsername, newProfilePlatform);
    if (editingProfileId) {
       setProfiles(prev => prev.map(p => p.id === editingProfileId ? { ...p, username: cleanUser, displayName: newProfileDisplayName, platform: newProfilePlatform, categoryId: newProfileCategory, notes: newProfileNotes } : p));
    } else {
       const newProfile: Profile = { id: Date.now().toString(), username: cleanUser, displayName: newProfileDisplayName, platform: newProfilePlatform, categoryId: newProfileCategory, notes: newProfileNotes, createdAt: Date.now() };
       setProfiles([newProfile, ...profiles]);
    }
    setIsAddProfileOpen(false);
    resetProfileForm();
  };

  const handleStartEdit = (profile: Profile) => {
    setNewProfileUsername(profile.username);
    setNewProfileDisplayName(profile.displayName || '');
    setNewProfilePlatform(profile.platform);
    setNewProfileNotes(profile.notes);
    setEditingProfileId(profile.id);
    
    // Reverse engineer hierarchy
    const cat = categories.find(c => c.id === profile.categoryId);
    if (cat) {
        if (cat.parentId) {
             const parent = categories.find(p => p.id === cat.parentId);
             setNewProfileFolderId(parent?.folderId || '');
             setNewProfileParentId(cat.parentId);
             setNewProfileCategory(cat.id);
        } else {
             setNewProfileFolderId(cat.folderId || '');
             setNewProfileParentId(cat.id);
             setNewProfileCategory(cat.id);
        }
    } else {
        setNewProfileCategory(profile.categoryId); // Fallback
    }

    setIsPreviewOpen(false);
    setIsAddProfileOpen(true);
  };

  const resetProfileForm = () => {
    setNewProfileUsername('');
    setNewProfileDisplayName('');
    setNewProfileNotes('');
    setNewProfileCategory('');
    setNewProfileFolderId('');
    setNewProfileParentId('');
    setNewProfilePlatform('instagram');
    setEditingProfileId(null);
    setPickerExpandedCategoryIds([]);
  };

  const handleDeleteProfile = (id: string) => {
    if (window.confirm("Are you sure you want to delete this profile?")) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      setIsPreviewOpen(false);
    }
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
        setEditingCategoryId(category.id);
        setNewCategoryName(category.name);
        setNewCategoryColor(category.color);
        setNewCategoryParent(category.parentId || '');
        setNewCategoryFolder(category.folderId || '');

        // Check if custom color
        const isPreset = PASTEL_COLORS.includes(category.color);
        if (!isPreset && category.color.startsWith('hsl')) {
            setShowCustomColor(true);
            const match = category.color.match(/hsl\((\d+)/);
            if (match) setCustomHue(parseInt(match[1]));
            else setCustomHue(0);
        } else {
            setShowCustomColor(false);
            setCustomHue(0);
        }
    } else {
        setEditingCategoryId(null);
        setNewCategoryName('');
        setNewCategoryColor(PASTEL_COLORS[0]);
        setNewCategoryParent('');
        setNewCategoryFolder('');
        setShowCustomColor(false);
        setCustomHue(0);
    }
    setIsAddCategoryOpen(true);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName) return;
    if (!newCategoryParent && !newCategoryFolder) {
        alert("Please select a Folder for this category. Top-level categories must belong to a folder.");
        return;
    }
    let colorToUse = newCategoryColor;
    if (newCategoryParent) {
        const parent = categories.find(c => c.id === newCategoryParent);
        if (parent) colorToUse = parent.color;
    }
    const folderToUse = newCategoryParent ? undefined : (newCategoryFolder || undefined);
    if (editingCategoryId) {
        const updatedCategories = categories.map(c => {
            if (c.id === editingCategoryId) return { ...c, name: newCategoryName, color: colorToUse, parentId: newCategoryParent || undefined, folderId: folderToUse };
            return c;
        });
        const finalCategories = updatedCategories.map(c => {
            if (c.parentId === editingCategoryId) return { ...c, color: colorToUse };
            return c;
        });
        setCategories(finalCategories);
    } else {
        const newCategory: Category = { id: Date.now().toString(), name: newCategoryName, color: colorToUse, parentId: newCategoryParent || undefined, folderId: folderToUse };
        setCategories([...categories, newCategory]);
        if (newCategoryParent && !expandedCategoryIds.includes(newCategoryParent)) {
            setExpandedCategoryIds([...expandedCategoryIds, newCategoryParent]);
        }
    }
    setIsAddCategoryOpen(false);
    setNewCategoryName('');
    setNewCategoryParent('');
    setNewCategoryFolder('');
    setEditingCategoryId(null);
  };

  const handleDeleteCategory = (id: string) => {
    const hasChildren = categories.some(c => c.parentId === id);
    if (!window.confirm(hasChildren ? "Delete category and all subcategories?" : "Delete category?")) return;
    const childrenIds = categories.filter(c => c.parentId === id).map(c => c.id);
    const idsToDelete = [id, ...childrenIds];
    setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));
    if (selectedCategoryId && idsToDelete.includes(selectedCategoryId)) setSelectedCategoryId(null);
    setProfiles(prev => prev.map(p => idsToDelete.includes(p.categoryId) ? { ...p, categoryId: '' } : p));
  };

  const handleOpenPreview = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsPreviewOpen(true);
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedCategoryId(null);
    if (folderId && !expandedFolderIds.includes(folderId)) {
        setExpandedFolderIds(prev => [...prev, folderId]);
    }
  };

  const handleSelectCategory = (catId: string | null) => {
     setSelectedCategoryId(catId);
  };

  const handleShare = async () => {
    let text = `📂 Keepy Shared List\n\n`;
    const groupedData = new Map<string, any>();
    const UNFILED_KEY = 'unfiled_container';

    filteredProfiles.forEach(p => {
        const cat = categories.find(c => c.id === p.categoryId);
        if (!cat) return; 
        let folderId = UNFILED_KEY;
        let folderName = 'Unfiled';
        let parentId = cat.id;
        let parentName = cat.name;
        let subId: string | null = null;
        let subName = '';

        if (cat.parentId) {
            subId = cat.id;
            subName = cat.name;
            const parent = categories.find(c => c.id === cat.parentId);
            if (parent) {
                parentId = parent.id;
                parentName = parent.name;
                if (parent.folderId) {
                    folderId = parent.folderId;
                    const f = folders.find(fo => fo.id === parent.folderId);
                    if (f) folderName = f.name;
                }
            }
        } else {
            if (cat.folderId) {
                folderId = cat.folderId;
                const f = folders.find(fo => fo.id === cat.folderId);
                if (f) folderName = f.name;
            }
        }
        if (!groupedData.has(folderId)) groupedData.set(folderId, { name: folderName, parents: new Map() });
        const folderNode = groupedData.get(folderId);
        if (!folderNode.parents.has(parentId)) folderNode.parents.set(parentId, { name: parentName, subs: new Map(), profiles: [] });
        const parentNode = folderNode.parents.get(parentId);
        if (subId) {
            if (!parentNode.subs.has(subId)) parentNode.subs.set(subId, { name: subName, profiles: [] });
            parentNode.subs.get(subId).profiles.push(p);
        } else {
            parentNode.profiles.push(p);
        }
    });

    for (const [_, folder] of groupedData.entries()) {
        text += `📁 ${folder.name.toUpperCase()}\n`;
        text += `━━━━━━━━━━━━━━━━\n`;
        for (const [_, parent] of folder.parents.entries()) {
            text += `\n[ ${parent.name} ]\n`;
            if (parent.profiles.length > 0) {
                parent.profiles.forEach((p: Profile) => {
                    text += `• ${p.displayName || p.username} - ${getProfileLink(p)}\n`;
                });
            }
            for (const [_, sub] of parent.subs.entries()) {
                text += `\n   ↳ ${sub.name}\n`;
                sub.profiles.forEach((p: Profile) => {
                    text += `     • ${p.displayName || p.username} - ${getProfileLink(p)}\n`;
                });
            }
        }
        text += `\n\n`;
    }
    try {
      if (navigator.share) await navigator.share({ title: `Keepy List`, text });
      else { await navigator.clipboard.writeText(text); alert('Copied structured list to clipboard!'); }
    } catch (e) { console.error(e); }
  };
  
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Uncategorized';

  const renderLogo = () => {
    const fullLogo = darkMode ? BRANDING.logoDark : BRANDING.logoLight;
    if (fullLogo) return <img src={fullLogo} alt="Keepy" className="h-8 w-auto object-contain" />;
    return (
      <div className="flex items-center gap-2">
         {BRANDING.icon ? <img src={BRANDING.icon} alt="Icon" className="w-8 h-8 object-contain" /> : <Icons.Instagram className="text-pink-500 w-8 h-8" />}
         <span className={`text-2xl font-bold ${BRANDING.icon ? 'text-gray-900 dark:text-white' : 'bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500'}`}>Keepy</span>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-slate-700 text-center animate-in fade-in zoom-in duration-300">
           <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 border border-gray-100 dark:border-slate-700 p-3">
                 <img src={BRANDING.icon} alt="Keepy" className="w-full h-full object-contain" />
              </div>
           </div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Keepy</h1>
           <form onSubmit={handleLogin} className="space-y-4">
             <input type="password" value={loginCode} onChange={(e) => { setLoginCode(e.target.value); setLoginError(''); }} placeholder="Access Code" className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none text-center text-lg font-bold text-gray-900 dark:text-white" />
             {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
             <button type="submit" className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold">Unlock App</button>
           </form>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

      {/* --- Sidebar (Desktop) --- */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 h-20 flex items-center">{renderLogo()}</div>
        
        <div className="px-4 py-2 space-y-2">
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleOpenCategoryModal()} className="py-2 px-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 hover:text-pink-500 hover:border-pink-500 transition-colors flex items-center justify-center gap-1 text-xs font-medium">
                <Icons.Plus className="w-3 h-3" /> Cat
              </button>
              <button onClick={() => handleOpenFolderModal()} className="py-2 px-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 hover:text-blue-500 hover:border-blue-500 transition-colors flex items-center justify-center gap-1 text-xs font-medium">
                <Icons.Plus className="w-3 h-3" /> Folder
              </button>
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div 
             onClick={() => { handleSelectFolder(null); handleSelectCategory(null); }}
             className={`w-full flex items-center rounded-xl cursor-pointer transition-colors ${selectedCategoryId === null && selectedFolderId === null ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
          >
            <div className="w-8 flex-shrink-0"></div>
            <div className="flex-1 flex items-center gap-3 py-3 pr-4">
              <Icons.FolderOpen className="w-5 h-5 text-gray-500" />
              <span className={`font-semibold ${selectedCategoryId === null && selectedFolderId === null ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'}`}>All Profiles</span>
              <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-500 font-medium">{profiles.length}</span>
            </div>
          </div>
          {displayTree.folders.map(folder => (
            <div key={folder.id} className="space-y-1 mt-2">
                <div className={`group flex items-center rounded-xl transition-colors pr-2 ${selectedFolderId === folder.id && selectedCategoryId === null ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                    <div className="w-8 flex justify-center flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); toggleFolderExpand(folder.id); }} className="p-1 text-gray-400">
                             {expandedFolderIds.includes(folder.id) ? <Icons.ChevronDown className="w-4 h-4" /> : <Icons.ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                    <button onClick={() => handleSelectFolder(folder.id)} className={`flex-1 flex items-center gap-2 py-2 text-left ${selectedFolderId === folder.id ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>
                        <span className="truncate">{folder.name}</span>
                        <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-gray-500">{folder.categories.length}</span>
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 flex">
                         <button onClick={(e) => { e.stopPropagation(); handleOpenFolderModal(folder); }} className="p-1.5 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-3 h-3" /></button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
                {expandedFolderIds.includes(folder.id) && (
                    <div className="ml-4 pl-3 border-l border-gray-200 dark:border-slate-800 space-y-1">
                        {folder.categories.map(cat => (
                            <div key={cat.id} className="space-y-1">
                                <div className={`group flex items-center rounded-lg transition-colors pr-1 ${selectedCategoryId === cat.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'}`}>
                                    <div className="w-6 flex justify-center flex-shrink-0">
                                       {cat.children.length > 0 && (
                                            <button onClick={(e) => { e.stopPropagation(); toggleCategoryExpand(cat.id); }} className="text-gray-400">
                                                {expandedCategoryIds.includes(cat.id) ? <Icons.ChevronDown className="w-3 h-3" /> : <Icons.ChevronRight className="w-3 h-3" />}
                                            </button>
                                       )}
                                    </div>
                                    <button onClick={() => handleSelectCategory(cat.id)} className={`flex-1 flex items-center gap-2 py-1.5 text-left text-sm ${selectedCategoryId === cat.id ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'}`}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                    <div className="opacity-0 group-hover:opacity-100 flex">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(cat); }} className="p-1 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                {expandedCategoryIds.includes(cat.id) && cat.children.map(sub => (
                                    <div key={sub.id} className={`flex items-center gap-2 pl-8 py-1.5 rounded-lg cursor-pointer ${selectedCategoryId === sub.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'}`} onClick={() => handleSelectCategory(sub.id)}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub.color }}></span>
                                        <span className="text-xs text-gray-500 dark:text-slate-400">{sub.name}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ))}
          {displayTree.unfiled.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h4 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Unfiled</h4>
                  {displayTree.unfiled.map(cat => (
                      <div key={cat.id} className="space-y-1">
                          <div className={`group flex items-center rounded-xl transition-colors pr-2 ${selectedCategoryId === cat.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                                <div className="w-8 flex justify-center flex-shrink-0">
                                   {cat.children.length > 0 && (
                                        <button onClick={(e) => { e.stopPropagation(); toggleCategoryExpand(cat.id); }} className="text-gray-400">
                                            {expandedCategoryIds.includes(cat.id) ? <Icons.ChevronDown className="w-4 h-4" /> : <Icons.ChevronRight className="w-4 h-4" />}
                                        </button>
                                   )}
                                </div>
                                <button onClick={() => handleSelectCategory(cat.id)} className={`flex-1 flex items-center gap-3 py-2 text-left ${selectedCategoryId === cat.id ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'}`}>
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                                    <span className="truncate">{cat.name}</span>
                                </button>
                                <div className="opacity-0 group-hover:opacity-100 flex">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(cat); }} className="p-1.5 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-3 h-3" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                          </div>
                          {expandedCategoryIds.includes(cat.id) && (
                            <div className="ml-8 space-y-1">
                                {cat.children.map(sub => (
                                     <div key={sub.id} onClick={() => handleSelectCategory(sub.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${selectedCategoryId === sub.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50'}`}>
                                         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }}></span>
                                         <span className="text-sm text-gray-600 dark:text-slate-400">{sub.name}</span>
                                     </div>
                                ))}
                            </div>
                          )}
                      </div>
                  ))}
              </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
            <div className="flex gap-2">
               <button onClick={handleExportData} className="flex-1 text-xs py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Export</button>
               <button onClick={handleImportClick} className="flex-1 text-xs py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">Import</button>
            </div>
           <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 w-full px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400">
             {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />} <span>Theme</span>
           </button>
           <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 rounded-xl hover:bg-red-50 text-red-500"><Icons.Lock className="w-5 h-5" /> <span>Lock</span></button>
           <div className="text-center text-[10px] text-gray-300 font-mono">v{APP_VERSION}</div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col h-full bg-white/50 dark:bg-black/20 overflow-x-hidden min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+32px)] border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">{renderLogo()}</div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsManageCategoriesOpen(true)} className="p-2 text-gray-500 hover:text-pink-500 rounded-lg hover:bg-gray-100"><Icons.FolderOpen className="w-6 h-6" /></button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 rounded-lg hover:bg-gray-100">{darkMode ? <Icons.Sun className="w-6 h-6" /> : <Icons.Moon className="w-6 h-6" />}</button>
            <button onClick={handleLogout} className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"><Icons.Lock className="w-6 h-6" /></button>
          </div>
        </div>

        <header className="p-4 md:p-8 pb-0 max-w-7xl mx-auto w-full">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
                  <span className="truncate max-w-full">
                    {selectedCategoryId ? getCategoryName(selectedCategoryId) : selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'All Profiles'}
                  </span>
                  {/* ALWAYS SHOW COUNT */}
                  <span className="text-sm font-normal px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 flex-shrink-0">
                       {filteredProfiles.length}
                  </span>
                  <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-pink-500 flex-shrink-0"><Icons.Share2 className="w-5 h-5" /></button>
                </h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1 truncate">
                  {selectedCategoryId || selectedFolderId ? 'Filtered collection view' : 'Your entire collection in one place'}
                </p>
              </div>
              <button onClick={() => { resetProfileForm(); setIsAddProfileOpen(true); }} className="w-full md:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-95 flex-shrink-0">
                <Icons.Plus className="w-5 h-5" /> Add Profile
              </button>
           </div>

           {/* --- UPDATED TOOLBAR --- */}
           <div className="flex flex-col gap-4">
              {/* 1. Search Bar */}
              <div className="relative w-full shadow-sm">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search className="w-5 h-5" /></div>
                <input 
                  type="text" 
                  placeholder="Search profiles, notes, or tags..." 
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>

              {/* 2. Filter & Sort Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-gradient pt-1">
                 <div className="md:hidden flex gap-2">
                    <FilterPill 
                        icon={Icons.FolderOpen}
                        label="Folder"
                        value={selectedFolderId || ''}
                        onChange={(val) => handleSelectFolder(val || null)}
                        options={[{ value: '', label: 'All Folders' }, ...folders.map(f => ({ value: f.id, label: f.name }))]}
                        isActive={!!selectedFolderId}
                    />
                    
                    <FilterPill 
                        icon={Icons.Filter}
                        label="Category"
                        value={activeParentId || ''}
                        onChange={(val) => handleSelectCategory(val || null)}
                        options={[{ value: '', label: 'All Categories' }, ...dropdownParents.map(c => ({ value: c.id, label: c.name }))]}
                        isActive={!!activeParentId}
                    />

                    {activeParentId && dropdownSubs.length > 0 && (
                        <FilterPill 
                            icon={Icons.Filter} // Sub-filter icon
                            label="Sub"
                            value={activeSubId || activeParentId}
                            onChange={(val) => handleSelectCategory(val)}
                            options={[{ value: activeParentId, label: 'All Subcategories' }, ...dropdownSubs.map(s => ({ value: s.id, label: s.name }))]}
                            isActive={!!activeSubId && activeSubId !== activeParentId}
                        />
                    )}
                    
                    {/* Vertical Divider for Visual separation on mobile scroll */}
                    <div className="w-[1px] h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                 </div>

                 <FilterPill 
                    icon={Icons.Globe}
                    label="Platform"
                    value={platformFilter}
                    onChange={(val) => setPlatformFilter(val as Platform | 'all')}
                    options={[
                        { value: 'all', label: 'All Platforms' },
                        { value: 'instagram', label: 'Instagram' },
                        { value: 'facebook', label: 'Facebook' },
                        { value: 'x', label: 'X' },
                        { value: 'tiktok', label: 'TikTok' },
                        { value: 'website', label: 'Website' }
                    ]}
                    isActive={platformFilter !== 'all'}
                 />

                 {/* Spacer to push Sort to end on desktop if desired, or just keep flow */}
                 <div className="flex-1 md:hidden"></div>
                 <div className="hidden md:flex-1"></div>

                 <FilterPill 
                    icon={Icons.ArrowUpDown}
                    label="Sort"
                    value={profileSort}
                    onChange={(val) => setProfileSort(val as SortOption)}
                    options={[
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'a-z', label: 'A-Z' },
                        { value: 'z-a', label: 'Z-A' },
                        { value: 'color', label: 'By Color' }
                    ]}
                    variant="highlight"
                 />
              </div>
           </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-7xl mx-auto">
             {filteredProfiles.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                    <div className="text-6xl mb-4">🫧</div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">No profiles found</h3>
                    <p className="text-sm mt-2 text-gray-500">Try changing filters or adding a profile.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredProfiles.map(profile => (
                   <ProfileCard 
                     key={profile.id} 
                     profile={profile} 
                     category={categories.find(c => c.id === profile.categoryId)}
                     path={getProfilePath(profile)}
                     onClick={handleOpenPreview}
                     onEdit={(e, p) => { e.stopPropagation(); handleStartEdit(p); }}
                   />
                 ))}
               </div>
             )}
           </div>
        </div>
      </main>

      {/* --- Modals (Keep existing content) --- */}
      {/* Profile Modal */}
      <Modal isOpen={isAddProfileOpen} onClose={() => { setIsAddProfileOpen(false); resetProfileForm(); }} title={editingProfileId ? "Edit Profile" : "Add Profile"}>
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Platform</label>
             <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['instagram','facebook','x','tiktok','website'].map(p => (
                   <button key={p} onClick={() => setNewProfilePlatform(p as Platform)} className={`px-4 py-2 rounded-lg border text-sm capitalize whitespace-nowrap ${newProfilePlatform === p ? 'bg-pink-50 border-pink-500 text-pink-600' : 'border-gray-200'}`}>{p === 'x' ? 'X' : p}</button>
                ))}
             </div>
           </div>
           <div>
             <label className="block text-sm font-medium mb-1">Username/URL</label>
             <input type="text" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none" placeholder="Username" value={newProfileUsername} onChange={(e) => handleProfileInput(e.target.value)} />
           </div>
           <div>
             <label className="block text-sm font-medium mb-1">Display Name</label>
             <input type="text" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none" value={newProfileDisplayName} onChange={(e) => setNewProfileDisplayName(e.target.value)} />
           </div>
           
           {/* HIERARCHICAL SELECTION */}
           <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 space-y-3">
             {/* 1. Folder Select */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">1. Select Folder</label>
                <select 
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 outline-none"
                    value={newProfileFolderId}
                    onChange={(e) => {
                        setNewProfileFolderId(e.target.value);
                        setNewProfileParentId('');
                        setNewProfileCategory('');
                    }}
                >
                    <option value="">-- Choose Folder --</option>
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    {/* Only show Unfiled option if there are actually unfiled root categories */}
                    {categories.some(c => !c.parentId && !c.folderId) && (
                        <option value="unfiled">Unfiled</option>
                    )}
                </select>
             </div>

             {/* 2. Parent Category Select */}
             <div className={`${!newProfileFolderId ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">2. Select Category</label>
                <select 
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 outline-none"
                    value={newProfileParentId}
                    onChange={(e) => {
                        const val = e.target.value;
                        setNewProfileParentId(val);
                        setNewProfileCategory(val); // Default to parent ID
                    }}
                    disabled={!newProfileFolderId}
                >
                    <option value="">-- Choose Category --</option>
                    {categories
                        .filter(c => {
                             if (!newProfileFolderId) return false;
                             if (newProfileFolderId === 'unfiled') return !c.parentId && !c.folderId;
                             return !c.parentId && c.folderId === newProfileFolderId;
                        })
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                    }
                </select>
             </div>

             {/* 3. Subcategory Select (Conditional) */}
             {newProfileParentId && categories.some(c => c.parentId === newProfileParentId) && (
                 <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">3. Select Subcategory (Optional)</label>
                    <select 
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 outline-none"
                        value={newProfileCategory !== newProfileParentId ? newProfileCategory : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setNewProfileCategory(val || newProfileParentId);
                        }}
                    >
                        <option value="">None (Keep as {categories.find(c => c.id === newProfileParentId)?.name})</option>
                        {categories
                            .filter(c => c.parentId === newProfileParentId)
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))
                        }
                    </select>
                 </div>
             )}
           </div>

           <div>
             <label className="block text-sm font-medium mb-1">Notes</label>
             <textarea className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none h-20" value={newProfileNotes} onChange={(e) => setNewProfileNotes(e.target.value)} />
           </div>
           <button onClick={handleSaveProfile} disabled={!newProfileUsername || !newProfileCategory} className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Save Profile</button>
         </div>
      </Modal>

      {/* Folder Manager Modal */}
      <Modal isOpen={isManageFoldersOpen} onClose={() => setIsManageFoldersOpen(false)} title={editingFolderId ? "Edit Folder" : "New Folder"}>
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Folder Name</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none" placeholder="e.g. Work, Personal" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
              </div>
              <button onClick={handleSaveFolder} disabled={!newFolderName} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">{editingFolderId ? "Update Folder" : "Create Folder"}</button>
          </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={isAddCategoryOpen} onClose={() => { setIsAddCategoryOpen(false); setEditingCategoryId(null); setIsCreatingFolderInline(false); setNewInlineFolderName(''); }} title={editingCategoryId ? "Edit Category" : "New Category"}>
          <div className="space-y-4">
             {(() => {
                 // --- Modal Logic Helpers ---
                 // We determine if we are editing a Parent or Sub to strictly enforce hierarchy rules
                 const isEditing = !!editingCategoryId;
                 const editingCatObj = isEditing ? categories.find(c => c.id === editingCategoryId) : null;
                 const isEditingParent = isEditing && editingCatObj && !editingCatObj.parentId;
                 const isEditingSub = isEditing && editingCatObj && !!editingCatObj.parentId;
                 
                 return (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category Name</label>
                      <input type="text" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    {!newCategoryParent && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Color</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {PASTEL_COLORS.map(color => (
                              <button 
                                key={color} 
                                onClick={() => { setNewCategoryColor(color); setShowCustomColor(false); }} 
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${newCategoryColor === color && !showCustomColor ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`} 
                                style={{ backgroundColor: color }} 
                              />
                            ))}
                            <button
                              onClick={() => {
                                  setShowCustomColor(true);
                                  const h = customHue || 0;
                                  setNewCategoryColor(`hsl(${h}, 100%, 50%)`);
                              }}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-gradient-to-tr from-pink-300 via-purple-300 to-blue-300 transition-transform ${showCustomColor ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                              title="Custom Color"
                            >
                              <Icons.Plus className="w-4 h-4 text-white drop-shadow-sm" />
                            </button>
                          </div>

                          {showCustomColor && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Custom Hue</span>
                                    <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm" style={{ backgroundColor: `hsl(${customHue}, 100%, 50%)` }}></div>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={customHue}
                                  onChange={(e) => {
                                      const h = parseInt(e.target.value);
                                      setCustomHue(h);
                                      setNewCategoryColor(`hsl(${h}, 100%, 50%)`);
                                  }}
                                  className="w-full h-3 rounded-full appearance-none cursor-pointer touch-none"
                                  style={{
                                    background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                                  }}
                                />
                              </div>
                          )}
                        </div>
                    )}
                    
                    {/* Parent Selection */}
                    <div className={isEditingParent ? "opacity-50 pointer-events-none" : ""}>
                      <label className="block text-sm font-medium mb-1">
                          Parent Category {isEditingSub ? "(Select new parent to move)" : "(Optional)"}
                      </label>
                      <select 
                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none" 
                        value={newCategoryParent} 
                        onChange={(e) => setNewCategoryParent(e.target.value)} 
                        disabled={isEditingParent} // Locked for existing parents to enforce hierarchy
                      >
                        {/* If editing a sub, force them to pick a parent (hide None), so it remains a sub */}
                        {!isEditingSub && <option value="">None (Top Level)</option>}
                        
                        {folders.map(f => {
                            const eligible = categories.filter(c => !c.parentId && c.id !== editingCategoryId && c.folderId === f.id);
                            if (eligible.length === 0) return null;
                            return (
                                <optgroup key={f.id} label={`📂 ${f.name}`}>
                                    {eligible.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </optgroup>
                            );
                        })}

                        {/* Unfiled */}
                        {(() => {
                            const eligible = categories.filter(c => !c.parentId && c.id !== editingCategoryId && !c.folderId);
                            if (eligible.length === 0) return null;
                            return (
                                <optgroup label="Unfiled">
                                    {eligible.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </optgroup>
                            );
                        })()}
                      </select>

                      {/* Feedback for move */}
                      {newCategoryParent && (
                          <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                              <Icons.FolderOpen className="w-4 h-4 flex-shrink-0" />
                              <span>
                                 This category will live in <strong>{folders.find(f => f.id === categories.find(c => c.id === newCategoryParent)?.folderId)?.name || 'Unfiled'}</strong>
                              </span>
                          </div>
                      )}

                      {isEditingParent && <p className="text-[10px] text-gray-400 mt-1">Top-level categories cannot become subcategories.</p>}
                    </div>

                    {/* Folder Selection (Required if Top Level) */}
                    {/* Show if we are creating new OR if we are explicitly top level (not a sub) */}
                    {(!newCategoryParent || isEditingParent) && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium">Folder <span className="text-red-500">*</span></label>
                                {!isCreatingFolderInline && (
                                    <button onClick={() => setIsCreatingFolderInline(true)} className="text-xs text-blue-500 font-bold hover:underline">+ New Folder</button>
                                )}
                            </div>
                            
                            {isCreatingFolderInline ? (
                                <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <input 
                                        type="text" 
                                        className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none text-sm"
                                        placeholder="New Folder Name"
                                        value={newInlineFolderName}
                                        onChange={(e) => setNewInlineFolderName(e.target.value)}
                                        autoFocus
                                    />
                                    <button 
                                        onClick={handleSaveInlineFolder}
                                        disabled={!newInlineFolderName.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                    <button 
                                        onClick={() => { setIsCreatingFolderInline(false); setNewInlineFolderName(''); }}
                                        className="px-3 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <select 
                                    className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border dark:border-slate-700 outline-none ${!newCategoryFolder ? 'border-red-300' : 'border-gray-200'}`} 
                                    value={newCategoryFolder} 
                                    onChange={(e) => setNewCategoryFolder(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Folder (Required) --</option>
                                    {folders.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            )}
                            {!isCreatingFolderInline && folders.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Please create a Folder first.</p>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={handleSaveCategory} 
                        disabled={!newCategoryName || (!newCategoryParent && !newCategoryFolder)} 
                        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editingCategoryId ? 'Update' : 'Create'}
                    </button>
                 </>
                 );
             })()}
          </div>
      </Modal>
      
      {/* Mobile Manager Screen */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
           <div className="pt-[calc(env(safe-area-inset-top)+32px)] px-4 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsManageCategoriesOpen(false)} className="p-2 -ml-2 rounded-full"><Icons.ArrowLeft className="w-6 h-6" /></button>
                  <h2 className="text-xl font-bold">Manage</h2>
              </div>
           </div>

           {/* Mobile Sort Controls */}
           <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex gap-3">
              <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Sort Folders</label>
                 <select value={folderSort} onChange={(e) => setFolderSort(e.target.value as SortOption)} className="w-full text-xs p-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                 </select>
              </div>
              <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Sort Categories</label>
                 <select value={categorySort} onChange={(e) => setCategorySort(e.target.value as SortOption)} className="w-full text-xs p-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                    <option value="color">Color</option>
                 </select>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Folders Section */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-white">Folders</h3>
                      <div className="flex gap-3">
                        <button onClick={() => handleOpenCategoryModal()} className="text-pink-500 text-sm font-medium">+ Category</button>
                        <button onClick={() => handleOpenFolderModal()} className="text-blue-500 text-sm font-medium">+ Folder</button>
                      </div>
                  </div>
                  {folders.length === 0 && <p className="text-sm text-gray-400 italic">No folders created.</p>}
                  
                  {/* Cleaned Up Hierarchical View */}
                  <div className="space-y-2">
                    {displayTree.folders.map(f => (
                        <div key={f.id} className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-2" onClick={() => toggleFolderExpand(f.id)}>
                                    <button className="text-gray-400">
                                        {expandedFolderIds.includes(f.id) ? <Icons.ChevronDown className="w-5 h-5"/> : <Icons.ChevronRight className="w-5 h-5"/>}
                                    </button>
                                    <span className="font-semibold">{f.name}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenFolderModal(f)} className="p-2 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDeleteFolder(f.id)} className="p-2 text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            
                            {/* Categories in Folder */}
                            {expandedFolderIds.includes(f.id) && (
                                <div className="p-2 space-y-2">
                                    {f.categories.length === 0 && (
                                        <p className="text-xs text-gray-400 pl-8 italic">No categories.</p>
                                    )}
                                    {f.categories.map(c => (
                                        <div key={c.id}>
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700">
                                                <div className="flex items-center gap-2">
                                                    {c.children.length > 0 && (
                                                        <button onClick={() => toggleCategoryExpand(c.id)} className="text-gray-400">
                                                            {expandedCategoryIds.includes(c.id) ? <Icons.ChevronDown className="w-4 h-4"/> : <Icons.ChevronRight className="w-4 h-4"/>}
                                                        </button>
                                                    )}
                                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: c.color}}></div>
                                                    <span className="text-sm font-medium">{c.name}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleOpenCategoryModal(c)} className="p-1 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-4 h-4"/></button>
                                                    <button onClick={() => handleDeleteCategory(c.id)} className="p-1 text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            {/* Subcategories (Always A-Z) */}
                                            {expandedCategoryIds.includes(c.id) && (
                                                <div className="pl-6 mt-1 space-y-1">
                                                    {c.children.map(sub => (
                                                        <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: sub.color}}></div>
                                                                <span className="text-xs">{sub.name}</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleOpenCategoryModal(sub)} className="p-1 text-gray-400 hover:text-blue-500"><Icons.Edit2 className="w-3 h-3"/></button>
                                                                <button onClick={() => handleDeleteCategory(sub.id)} className="p-1 text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-3 h-3"/></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                  </div>
              </div>
           </div>
           
           {/* Backup */}
           <div className="p-4 border-t border-gray-100 dark:border-slate-800 pb-[calc(env(safe-area-inset-bottom)+16px)]">
               <div className="flex gap-2">
                   <button onClick={handleExportData} className="flex-1 bg-gray-100 dark:bg-slate-800 py-3 rounded-xl text-sm font-medium">Export Backup</button>
                   <button onClick={handleImportClick} className="flex-1 bg-gray-100 dark:bg-slate-800 py-3 rounded-xl text-sm font-medium">Restore Backup</button>
               </div>
               <div className="text-center text-[10px] text-gray-300 font-mono mt-4">v{APP_VERSION}</div>
           </div>
        </div>
      )}

      {/* Profile Details Modal (Existing) */}
      {selectedProfile && (
        <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Details">
           <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-bold mt-2 text-center">{selectedProfile.displayName || selectedProfile.username}</h2>
              
              {/* UPDATED HIERARCHY DISPLAY */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                 {(() => {
                    const hierarchy = [];
                    // Platform
                    hierarchy.push(
                        <span key="platform" className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                            {selectedProfile.platform}
                        </span>
                    );

                    const cat = categories.find(c => c.id === selectedProfile.categoryId);
                    if (cat) {
                        let folderId = cat.folderId;
                        let parentCat = null;

                        if (cat.parentId) {
                            parentCat = categories.find(c => c.id === cat.parentId);
                            if (parentCat && parentCat.folderId) folderId = parentCat.folderId;
                        } else {
                            parentCat = cat; // It is the parent
                        }

                        // Folder
                        if (folderId) {
                            const f = folders.find(fo => fo.id === folderId);
                            if (f) {
                                hierarchy.push(
                                    <span key="folder" className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                        {f.name}
                                    </span>
                                );
                            }
                        }

                        // Parent Category (If we are in a sub, we show parent. If we are in a parent, we show parent)
                        if (parentCat) {
                             hierarchy.push(
                                <span key="parent" className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 border border-pink-100 dark:border-pink-800">
                                    {parentCat.name}
                                </span>
                            );
                        }
                        
                        // Sub Category (Only if cat has a parentId)
                        if (cat.parentId) {
                             hierarchy.push(
                                <span key="sub" className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                    {cat.name}
                                </span>
                            );
                        }
                    } else {
                         hierarchy.push(
                                <span key="uncat" className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700">
                                    Uncategorized
                                </span>
                         );
                    }
                    return hierarchy;
                 })()}
              </div>

           </div>
           <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl mb-6">
             <p className="text-gray-700 dark:text-gray-300">{selectedProfile.notes || "No notes."}</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <a href={getProfileLink(selectedProfile)} target="_blank" rel="noreferrer" className="col-span-2 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">Open</a>
              <button onClick={() => handleStartEdit(selectedProfile)} className="py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-bold">Edit</button>
              <button onClick={() => handleDeleteProfile(selectedProfile.id)} className="py-3 bg-red-50 text-red-500 rounded-xl font-bold">Delete</button>
           </div>
        </Modal>
      )}

    </div>
  );
}