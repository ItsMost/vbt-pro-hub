import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_ATHLETES, type MockAthleteProfile, type AthleteLiftTest } from '../data/mockAthletes';
import { EXERCISE_PROFILES, type VBTDataPoint } from '../utils/vbtEngine';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  fetchAthletesFromCloud, 
  upsertAthleteToCloud, 
  deleteAthleteFromCloud, 
  syncAllAthletesToCloud, 
  subscribeToAthletesRealtime,
  testSupabaseConnection
} from '../utils/supabaseClient';

const STORAGE_KEY_ATHLETES = 'peak_vbt_athletes_v3_store';
const STORAGE_KEY_SELECTED = 'peak_vbt_selected_athlete_id_v3';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'unconfigured' | 'error';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AthleteContextType {
  athletes: MockAthleteProfile[];
  selectedAthleteId: string;
  selectedAthlete: MockAthleteProfile;
  setSelectedAthleteId: (id: string) => void;
  addAthlete: (name: string, sportEvent: string, bodyWeightKg: number, notes?: string) => Promise<void>;
  updateAthlete: (updated: MockAthleteProfile) => Promise<void>;
  deleteAthlete: (athleteId: string) => Promise<void>;
  updateAthleteTestPoints: (athleteId: string, exercise: string, points: VBTDataPoint[], mvt: number) => Promise<void>;
  updateAthleteManual1RM: (athleteId: string, exercise: string, oneRMKg: number) => Promise<void>;
  resetToDefaults: () => void;
  toasts: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  // Supabase Cloud Sync Props
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  supabaseConfig: { url: string; anonKey: string; isConfigured: boolean };
  updateSupabaseConfig: (url: string, anonKey: string) => Promise<boolean>;
  disconnectSupabase: () => void;
  uploadLocalToCloud: () => Promise<void>;
  manualCloudSync: () => Promise<void>;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);

export const AthleteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Local State initialization
  const [athletes, setAthletes] = useState<MockAthleteProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATHLETES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load athletes from storage:', e);
    }
    return MOCK_ATHLETES;
  });

  const [selectedAthleteId, setSelectedAthleteIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED);
      if (saved && athletes.some(a => a.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to load selected athlete:', e);
    }
    return athletes[0]?.id || MOCK_ATHLETES[0].id;
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // Supabase State
  const [supabaseConfig, setSupabaseConfig] = useState(() => getSupabaseCredentials());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    getSupabaseCredentials().isConfigured ? 'syncing' : 'unconfigured'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATHLETES, JSON.stringify(athletes));
    } catch (e) {
      console.warn('Failed to save athletes to storage:', e);
    }
  }, [athletes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED, selectedAthleteId);
    } catch (e) {
      console.warn('Failed to save selected athlete:', e);
    }
  }, [selectedAthleteId]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastNotification = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setSelectedAthleteId = (id: string) => {
    setSelectedAthleteIdState(id);
  };

  // Realtime subscription & initial fetch
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupabaseConfig(creds);

    if (!creds.isConfigured) {
      setSyncStatus('unconfigured');
      return;
    }

    let isMounted = true;
    let unsubscribeRealtime: (() => void) | null = null;

    async function initCloudSync() {
      try {
        setSyncStatus('syncing');
        const cloudAthletes = await fetchAthletesFromCloud();

        if (!isMounted) return;

        if (cloudAthletes && cloudAthletes.length > 0) {
          setAthletes(cloudAthletes);
          setLastSyncedAt(new Date());
          setSyncStatus('connected');

          // Ensure selected athlete still exists
          if (!cloudAthletes.some(a => a.id === selectedAthleteId)) {
            setSelectedAthleteIdState(cloudAthletes[0].id);
          }
        } else {
          // Cloud table is empty: automatically seed existing athletes to cloud
          const localSaved = localStorage.getItem(STORAGE_KEY_ATHLETES);
          const initialToSeed = localSaved ? JSON.parse(localSaved) : MOCK_ATHLETES;
          
          if (Array.isArray(initialToSeed) && initialToSeed.length > 0) {
            await syncAllAthletesToCloud(initialToSeed);
            setAthletes(initialToSeed);
            setLastSyncedAt(new Date());
            setSyncStatus('connected');
            showToast('تم رفع اللاعبين للسحابة بنجاح // Initial Cloud Sync Done', 'info');
          } else {
            setSyncStatus('connected');
          }
        }

        // Setup Realtime WebSocket listener for live sync between PC & Mobile
        unsubscribeRealtime = subscribeToAthletesRealtime(
          // On Insert from another device
          (newAth) => {
            setAthletes((prev) => {
              if (prev.some(a => a.id === newAth.id)) return prev;
              return [...prev, newAth];
            });
            setLastSyncedAt(new Date());
            showToast(`سحابة: تمت إضافة لاعب جديد (${newAth.name}) من جهاز آخر // Cloud Synced`, 'info');
          },
          // On Update from another device
          (updatedAth) => {
            setAthletes((prev) => prev.map(a => a.id === updatedAth.id ? updatedAth : a));
            setLastSyncedAt(new Date());
          },
          // On Delete from another device
          (deletedId) => {
            setAthletes((prev) => {
              const filtered = prev.filter(a => a.id !== deletedId);
              if (selectedAthleteId === deletedId && filtered.length > 0) {
                setSelectedAthleteIdState(filtered[0].id);
              }
              return filtered;
            });
            setLastSyncedAt(new Date());
          }
        );
      } catch (err) {
        console.error('Initial Supabase sync error:', err);
        if (isMounted) {
          setSyncStatus('error');
        }
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [supabaseConfig.url, supabaseConfig.anonKey, showToast]);

  // Update Supabase configuration from UI
  const updateSupabaseConfig = async (url: string, anonKey: string): Promise<boolean> => {
    try {
      const test = await testSupabaseConnection(url, anonKey);
      if (!test.success) {
        return false;
      }

      saveSupabaseCredentials(url, anonKey);
      const newCreds = getSupabaseCredentials();
      setSupabaseConfig(newCreds);
      return true;
    } catch (err) {
      console.error('Failed to update Supabase config:', err);
      return false;
    }
  };

  // Disconnect Supabase
  const disconnectSupabase = () => {
    clearSupabaseCredentials();
    setSupabaseConfig({ url: '', anonKey: '', isConfigured: false });
    setSyncStatus('unconfigured');
    setLastSyncedAt(null);
    showToast('تم فصل الاتصال بالسحابة والعمل في الوضع المحلي // Supabase Disconnected', 'info');
  };

  // Upload all local athletes to cloud
  const uploadLocalToCloud = async () => {
    if (!supabaseConfig.isConfigured) {
      showToast('يرجى ربط Supabase أولاً // Connect Supabase first', 'warning');
      return;
    }

    try {
      setSyncStatus('syncing');
      await syncAllAthletesToCloud(athletes);
      setLastSyncedAt(new Date());
      setSyncStatus('connected');
      showToast('تم رفع جميع بيانات اللاعبين للسحابة بنجاح // All Athletes Uploaded', 'success');
    } catch (err) {
      console.error('Failed to upload local data to cloud:', err);
      setSyncStatus('error');
      showToast('حدث خطأ أثناء رفع البيانات للسحابة // Upload Error', 'error');
    }
  };

  // Manual pull from cloud
  const manualCloudSync = async () => {
    if (!supabaseConfig.isConfigured) {
      showToast('يرجى ربط Supabase أولاً // Connect Supabase first', 'warning');
      return;
    }

    try {
      setSyncStatus('syncing');
      const cloudAthletes = await fetchAthletesFromCloud();
      if (cloudAthletes && cloudAthletes.length > 0) {
        setAthletes(cloudAthletes);
        setLastSyncedAt(new Date());
        setSyncStatus('connected');
        showToast('تم جلب أحدث البيانات من السحابة بنجاح // Cloud Data Pulled', 'success');
      } else {
        setSyncStatus('connected');
        showToast('قاعدة البيانات السحابية فارغة حالياً // Cloud Table Empty', 'info');
      }
    } catch (err) {
      console.error('Manual cloud sync failed:', err);
      setSyncStatus('error');
      showToast('تعذر جلب البيانات من السحابة // Pull Error', 'error');
    }
  };

  // CRUD Operations with Optimistic Local UI + Async Cloud Upsert
  const addAthlete = async (name: string, sportEvent: string, bodyWeightKg: number, notes?: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AT';

    const defaultTests: AthleteLiftTest[] = Object.keys(EXERCISE_PROFILES).map((ex) => {
      const defaultMvt = EXERCISE_PROFILES[ex].defaultMVT;
      return {
        exercise: ex,
        mvt: defaultMvt,
        testDate: new Date().toISOString().split('T')[0],
        rawPoints: [
          { load: Math.round(bodyWeightKg * 0.6), velocity: 1.05 },
          { load: Math.round(bodyWeightKg * 0.8), velocity: 0.90 },
          { load: Math.round(bodyWeightKg * 1.0), velocity: 0.75 },
          { load: Math.round(bodyWeightKg * 1.2), velocity: 0.55 },
        ]
      };
    });

    const defaultManualMap: Record<string, number> = {
      'Deep Squat': Math.round(bodyWeightKg * 1.6),
      'Half Squat': Math.round(bodyWeightKg * 1.9),
      'Quarter Squat': Math.round(bodyWeightKg * 2.3),
      'Bench Press': Math.round(bodyWeightKg * 1.0),
      'Trap Bar Deadlift': Math.round(bodyWeightKg * 2.1),
      'Power Clean': Math.round(bodyWeightKg * 1.2),
    };

    const newAthlete: MockAthleteProfile = {
      id,
      name,
      nameAr: name,
      sportEvent: sportEvent || 'Track & Field Athlete',
      bodyWeightKg: bodyWeightKg || 75,
      notes: notes || 'New Athlete Profile',
      avatarInitials: initials,
      colorAccent: 'emerald',
      manual1RMMap: defaultManualMap,
      tests: defaultTests,
    };

    // 1. Optimistic local update
    setAthletes(prev => [...prev, newAthlete]);
    setSelectedAthleteIdState(id);
    showToast(`تمت إضافة اللاعب ${name} بنجاح // Athlete Added`);

    // 2. Cloud sync
    if (supabaseConfig.isConfigured) {
      try {
        await upsertAthleteToCloud(newAthlete);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Failed to sync new athlete to cloud:', err);
      }
    }
  };

  const updateAthlete = async (updated: MockAthleteProfile) => {
    // 1. Optimistic local update
    setAthletes(prev => prev.map(a => a.id === updated.id ? updated : a));
    showToast(`تم تحديث بيانات اللاعب ${updated.name} // Profile Updated`);

    // 2. Cloud sync
    if (supabaseConfig.isConfigured) {
      try {
        await upsertAthleteToCloud(updated);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Failed to sync updated athlete to cloud:', err);
      }
    }
  };

  const deleteAthlete = async (athleteId: string) => {
    if (athletes.length <= 1) {
      showToast('لا يمكن حذف اللاعب الأخير في المنظومة // Cannot delete only remaining athlete', 'error');
      return;
    }

    const targetAth = athletes.find(a => a.id === athleteId);
    const filtered = athletes.filter(a => a.id !== athleteId);

    // 1. Optimistic local update
    setAthletes(filtered);
    if (selectedAthleteId === athleteId) {
      setSelectedAthleteIdState(filtered[0].id);
    }
    showToast(`تم حذف اللاعب ${targetAth?.name || ''} بنجاح // Athlete Deleted`, 'info');

    // 2. Cloud sync
    if (supabaseConfig.isConfigured) {
      try {
        await deleteAthleteFromCloud(athleteId);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Failed to delete athlete from cloud:', err);
      }
    }
  };

  const updateAthleteTestPoints = async (
    athleteId: string,
    exercise: string,
    points: VBTDataPoint[],
    mvt: number
  ) => {
    let updatedAthleteRef: MockAthleteProfile | null = null;

    setAthletes(prev =>
      prev.map(ath => {
        if (ath.id !== athleteId) return ath;

        const testIndex = ath.tests.findIndex(t => t.exercise === exercise);
        let updatedTests = [...ath.tests];

        if (testIndex >= 0) {
          updatedTests[testIndex] = {
            ...updatedTests[testIndex],
            rawPoints: points,
            mvt,
            testDate: new Date().toISOString().split('T')[0],
          };
        } else {
          updatedTests.push({
            exercise,
            mvt,
            rawPoints: points,
            testDate: new Date().toISOString().split('T')[0],
          });
        }

        const res = {
          ...ath,
          tests: updatedTests,
        };
        updatedAthleteRef = res;
        return res;
      })
    );

    showToast(`تم حفظ نقاط اختبار ${exercise} بنجاح // Test Points Saved`);

    // Cloud sync
    if (supabaseConfig.isConfigured && updatedAthleteRef) {
      try {
        await upsertAthleteToCloud(updatedAthleteRef);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Failed to sync test points to cloud:', err);
      }
    }
  };

  const updateAthleteManual1RM = async (
    athleteId: string,
    exercise: string,
    oneRMKg: number
  ) => {
    let updatedAthleteRef: MockAthleteProfile | null = null;

    setAthletes(prev =>
      prev.map(ath => {
        if (ath.id !== athleteId) return ath;
        const res = {
          ...ath,
          manual1RMMap: {
            ...ath.manual1RMMap,
            [exercise]: oneRMKg,
          }
        };
        updatedAthleteRef = res;
        return res;
      })
    );

    showToast(`تم حفظ 1RM المباشر (${oneRMKg} kg) لتمرين ${exercise} // Manual 1RM Updated`);

    // Cloud sync
    if (supabaseConfig.isConfigured && updatedAthleteRef) {
      try {
        await upsertAthleteToCloud(updatedAthleteRef);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Failed to sync manual 1RM to cloud:', err);
      }
    }
  };

  const resetToDefaults = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_ATHLETES);
      localStorage.removeItem(STORAGE_KEY_SELECTED);
      setAthletes(MOCK_ATHLETES);
      setSelectedAthleteIdState(MOCK_ATHLETES[0].id);
      showToast('تم استعادة البيانات الافتراضية // Restored Default Athletes', 'info');

      if (supabaseConfig.isConfigured) {
        syncAllAthletesToCloud(MOCK_ATHLETES).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || athletes[0] || MOCK_ATHLETES[0];

  return (
    <AthleteContext.Provider
      value={{
        athletes,
        selectedAthleteId,
        selectedAthlete,
        setSelectedAthleteId,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        updateAthleteTestPoints,
        updateAthleteManual1RM,
        resetToDefaults,
        toasts,
        showToast,
        removeToast,
        syncStatus,
        lastSyncedAt,
        supabaseConfig,
        updateSupabaseConfig,
        disconnectSupabase,
        uploadLocalToCloud,
        manualCloudSync,
      }}
    >
      {children}
    </AthleteContext.Provider>
  );
};

export const useAthletes = (): AthleteContextType => {
  const context = useContext(AthleteContext);
  if (!context) {
    throw new Error('useAthletes must be used within AthleteProvider');
  }
  return context;
};
