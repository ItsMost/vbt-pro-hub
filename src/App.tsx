import { useState, useEffect } from 'react';
import { AthleteProvider, useAthletes } from './context/AthleteContext';
import { LoadVelocityChart } from './components/LoadVelocityChart';
import { AddAthleteModal } from './components/AddAthleteModal';
import { EditAthleteModal } from './components/EditAthleteModal';
import { AthleteManagementDrawer } from './components/AthleteManagementDrawer';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { ToastContainer } from './components/Toast';
import type { MockAthleteProfile } from './data/mockAthletes';
import { 
  EXERCISE_PROFILES,
  calculateTheoretical1RM, 
  calculateManual1RMProfile,
  generateTrainingPercentageTable,
  type VBTDataPoint 
} from './utils/vbtEngine';
import { 
  Zap, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Sparkles, 
  TrendingUp, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  Users,
  Edit2,
  Sliders,
  Dumbbell,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { cn } from './utils/cn';

type CalculationMode = 'regression' | 'manual';

function SinglePageVBTApp() {
  const {
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
    showToast,
    syncStatus,
  } = useAthletes();

  // Modals & Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<MockAthleteProfile>(selectedAthlete);

  // Active calculation mode: 'regression' (Multi-point test) vs 'manual' (Direct 1RM)
  const [calcMode, setCalcMode] = useState<CalculationMode>('regression');

  // Exercise selection
  const [selectedExercise, setSelectedExercise] = useState<string>('Deep Squat');
  const currentExerciseProfile = EXERCISE_PROFILES[selectedExercise] || EXERCISE_PROFILES['Deep Squat'];
  
  const [mvt, setMvt] = useState<number>(currentExerciseProfile.defaultMVT);

  // Mode A: Regression test data points
  const [testPoints, setTestPoints] = useState<VBTDataPoint[]>([
    { load: 51, velocity: 1.06 },
    { load: 70, velocity: 0.96 },
    { load: 79, velocity: 0.86 },
    { load: 92, velocity: 0.72 },
    { load: 106, velocity: 0.53 },
  ]);

  // Mode B: Manual 1RM input value
  const [manual1RMInput, setManual1RMInput] = useState<number>(() => {
    return selectedAthlete.manual1RMMap?.[selectedExercise] || Math.round(selectedAthlete.bodyWeightKg * 1.6);
  });

  // Sync test points & manual 1RM when athlete or exercise changes
  useEffect(() => {
    const activeTest = selectedAthlete.tests.find(t => t.exercise === selectedExercise);
    if (activeTest && activeTest.rawPoints.length > 0) {
      setTestPoints([...activeTest.rawPoints]);
      setMvt(activeTest.mvt);
    } else {
      const defaultMvt = currentExerciseProfile.defaultMVT;
      setMvt(defaultMvt);
      const bw = selectedAthlete.bodyWeightKg;
      setTestPoints([
        { load: Math.round(bw * 0.6), velocity: 1.05 },
        { load: Math.round(bw * 0.8), velocity: 0.90 },
        { load: Math.round(bw * 1.0), velocity: 0.75 },
        { load: Math.round(bw * 1.2), velocity: 0.55 },
      ]);
    }

    const savedManual1RM = selectedAthlete.manual1RMMap?.[selectedExercise];
    if (savedManual1RM && savedManual1RM > 0) {
      setManual1RMInput(savedManual1RM);
    } else {
      setManual1RMInput(Math.round(selectedAthlete.bodyWeightKg * 1.6));
    }
  }, [selectedAthlete, selectedExercise, currentExerciseProfile]);

  const handleExerciseChange = (exName: string) => {
    setSelectedExercise(exName);
    const newProfile = EXERCISE_PROFILES[exName];
    if (newProfile) {
      setMvt(newProfile.defaultMVT);
    }
  };

  const handlePointChange = (index: number, field: 'load' | 'velocity', value: number) => {
    const updated = [...testPoints];
    updated[index][field] = Number(value);
    setTestPoints(updated);
  };

  const handleAddPoint = () => {
    const lastPoint = testPoints[testPoints.length - 1];
    const newLoad = lastPoint ? lastPoint.load + 15 : 60;
    const newVel = lastPoint ? Math.max(0.2, Number((lastPoint.velocity - 0.14).toFixed(2))) : 1.0;
    setTestPoints([...testPoints, { load: newLoad, velocity: newVel }]);
  };

  const handleRemovePoint = (index: number) => {
    if (testPoints.length <= 2) {
      showToast('يجب إبقاء نقطتين على الأقل لإجراء الانحدار الخطي // Min 2 points required', 'warning');
      return;
    }
    setTestPoints(testPoints.filter((_, i) => i !== index));
  };

  const handleSaveRegressionTest = () => {
    updateAthleteTestPoints(selectedAthlete.id, selectedExercise, testPoints, mvt);
  };

  const handleSaveManual1RM = () => {
    if (manual1RMInput <= 0) return;
    updateAthleteManual1RM(selectedAthlete.id, selectedExercise, manual1RMInput);
  };

  const handleResetRegression = () => {
    const defaultTest = selectedAthlete.tests.find(t => t.exercise === selectedExercise);
    if (defaultTest) {
      setTestPoints([...defaultTest.rawPoints]);
      setMvt(defaultTest.mvt);
      showToast(`تمت استعادة نقاط اختبار ${selectedExercise}`, 'info');
    }
  };

  // Perform VBT Calculations based on active mode
  const regressionResult = calculateTheoretical1RM(testPoints, mvt);
  const manualProfile = calculateManual1RMProfile(manual1RMInput, selectedExercise, mvt);

  const effective1RM = calcMode === 'regression' 
    ? regressionResult.estimated1RMKg 
    : manual1RMInput;

  const effectiveSlope = calcMode === 'regression'
    ? regressionResult.slope
    : manualProfile.slope;

  const effectiveIntercept = calcMode === 'regression'
    ? regressionResult.intercept
    : manualProfile.intercept;

  const trainingZonesTable = generateTrainingPercentageTable(
    effective1RM,
    effectiveSlope,
    effectiveIntercept
  );

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col bg-grid-pattern selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-glow-cyan flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">
                  PEAK <span className="text-cyan-400">VBT</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  PRO ATHLETE HUB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Multi-Exercise Load-Velocity Profiler & Force-Velocity Continuum
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Supabase Cloud Sync Trigger Button */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer",
                syncStatus === 'connected'
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow-lime"
                  : syncStatus === 'syncing'
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse"
                  : syncStatus === 'error'
                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-400/50"
              )}
              title="Supabase Cloud Realtime Sync Settings"
            >
              {syncStatus === 'connected' ? (
                <CloudCheck className="w-4 h-4 text-emerald-400" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : syncStatus === 'error' ? (
                <CloudOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Cloud className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden md:inline">
                {syncStatus === 'connected' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Cloud Sync'}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected' ? 'bg-emerald-400' :
                syncStatus === 'syncing' ? 'bg-cyan-400 animate-ping' :
                syncStatus === 'error' ? 'bg-rose-400' : 'bg-amber-400'
              }`} />
            </button>

            {/* Manage Athletes Drawer Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Roster ({athletes.length})</span>
            </button>

            {/* Add Athlete Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold shadow-glow-cyan transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Add Athlete</span>
            </button>

            {/* Reset Defaults */}
            <button
              onClick={() => {
                if (window.confirm('Restore default athlete profiles and test datasets?')) {
                  resetToDefaults();
                }
              }}
              title="Restore Default Mock Data"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
        
        {/* 1. Athlete Selector & Quick Profile Bar */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Athlete Pills Switcher */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                Active Athlete Profile
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {athletes.map((ath) => {
                  const isSelected = ath.id === selectedAthlete.id;
                  const isCyan = ath.colorAccent === 'cyan';

                  return (
                    <button
                      key={ath.id}
                      onClick={() => setSelectedAthleteId(ath.id)}
                      className={cn(
                        "px-4 py-2 rounded-2xl text-xs font-bold font-mono transition-all flex items-center gap-2 border cursor-pointer",
                        isSelected
                          ? isCyan
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-glow-lime"
                          : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                        isSelected ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"
                      )}>
                        {ath.avatarInitials}
                      </span>
                      <span>{ath.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Athlete Metadata & Quick Edit Trigger */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Sport / Discipline</span>
                <span className="text-white font-bold">{selectedAthlete.sportEvent}</span>
              </div>
              
              <div className="px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Body Weight</span>
                <span className="text-cyan-300 font-black">{selectedAthlete.bodyWeightKg} kg</span>
              </div>

              <button
                onClick={() => {
                  setEditingAthlete(selectedAthlete);
                  setIsEditModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Edit Athlete Profile"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit</span>
              </button>
            </div>

          </div>
        </div>

        {/* 2. Dual 1RM Mode Switcher & Exercise Library Bar */}
        <div className="space-y-4">
          
          {/* Dual Mode Switcher Banner */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                1RM Calculation Method
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">
                  {calcMode === 'regression' 
                    ? '🔬 Mode A: VBT Multi-Point Test (OLS Linear Regression)' 
                    : '⚡ Mode B: Direct Manual 1RM Input (Normative Continuum)'}
                </span>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setCalcMode('regression')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  calcMode === 'regression'
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>🔬 VBT Multi-Point Test</span>
              </button>

              <button
                onClick={() => setCalcMode('manual')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  calcMode === 'manual'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-lime"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>⚡ Direct 1RM Input</span>
              </button>
            </div>

          </div>

          {/* Expanded 6-Exercise Selector Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2.5 rounded-3xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase px-2 font-bold hidden sm:inline">
              Exercise:
            </span>

            {Object.keys(EXERCISE_PROFILES).map((ex) => {
              const isSelected = selectedExercise === ex;
              const prof = EXERCISE_PROFILES[ex];

              return (
                <button
                  key={ex}
                  onClick={() => handleExerciseChange(ex)}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{ex}</span>
                  <span className="text-[10px] opacity-75 font-normal">({prof.defaultMVT} m/s)</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* 3. Main Input & Interactive Regression Chart Card (2-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Data Input (Mode A: Regression Test Table OR Mode B: Direct Manual 1RM) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
              
              {/* MODE A: Regression Test Input Table */}
              {calcMode === 'regression' ? (
                <div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <span>Submaximal Test Sets ({selectedExercise})</span>
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Input incremental trial weights (kg) and mean velocities (m/s)
                      </p>
                    </div>

                    <button
                      onClick={handleAddPoint}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Set</span>
                    </button>
                  </div>

                  {/* Input Rows Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                          <th className="py-2 px-2.5">Set #</th>
                          <th className="py-2 px-2.5">Weight (kg)</th>
                          <th className="py-2 px-2.5">Mean Vel (m/s)</th>
                          <th className="py-2 px-2 text-right">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {testPoints.map((pt, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2 px-2.5 text-slate-400 font-bold">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-2.5">
                              <input
                                type="number"
                                step="0.5"
                                min="5"
                                max="400"
                                value={pt.load}
                                onChange={(e) => handlePointChange(idx, 'load', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:border-cyan-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0.05"
                                max="3.0"
                                value={pt.velocity}
                                onChange={(e) => handlePointChange(idx, 'velocity', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                onClick={() => handleRemovePoint(idx)}
                                disabled={testPoints.length <= 2}
                                title="Delete point"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MVT Cutoff Adjuster Slider */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-300">MVT Cutoff: </span>
                      <strong className="text-cyan-400">{mvt.toFixed(2)} m/s</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.10"
                        max="0.60"
                        step="0.01"
                        value={mvt}
                        onChange={(e) => setMvt(parseFloat(e.target.value))}
                        className="w-24 accent-cyan-400 cursor-pointer"
                      />
                      <button
                        onClick={() => setMvt(currentExerciseProfile.defaultMVT)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Actions for Mode A */}
                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                    <button
                      onClick={handleResetRegression}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    <button
                      onClick={handleSaveRegressionTest}
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Test Data</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* MODE B: Direct Manual 1RM Input */
                <div className="space-y-5">
                  <div className="pb-3 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 text-emerald-400" />
                      <span>Direct 1RM Input ({selectedExercise})</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter the athlete's known or tested 1RM in kilograms
                    </p>
                  </div>

                  {/* 1RM Number Input */}
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                    <label className="block text-xs font-mono text-slate-300 font-bold mb-2">
                      Barbell 1RM Load (kg):
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.5"
                        min="10"
                        max="500"
                        value={manual1RMInput}
                        onChange={(e) => setManual1RMInput(parseFloat(e.target.value) || 0)}
                        className="w-36 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-black text-xl focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-sm font-mono text-slate-400 font-bold">KG</span>
                      <span className="text-xs font-mono text-slate-400">
                        (~{Math.round(manual1RMInput * 2.20462)} lbs)
                      </span>
                    </div>
                  </div>

                  {/* Normative Parameters Info Box */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 font-mono text-xs space-y-1.5">
                    <div className="text-slate-300 font-bold text-[11px] uppercase">
                      Normative Velocity Parameters:
                    </div>
                    <div className="text-slate-400 text-[11px] flex justify-between">
                      <span>Standard Exercise MVT:</span>
                      <strong className="text-white">{mvt.toFixed(2)} m/s</strong>
                    </div>
                    <div className="text-slate-400 text-[11px] flex justify-between">
                      <span>Normative Intercept (V₀):</span>
                      <strong className="text-cyan-300">{currentExerciseProfile.normativeV0.toFixed(2)} m/s</strong>
                    </div>
                    <div className="text-slate-400 text-[11px] flex justify-between">
                      <span>Calculated Slope (m):</span>
                      <strong className="text-emerald-400">{manualProfile.slope}</strong>
                    </div>
                  </div>

                  {/* Actions for Mode B */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={handleSaveManual1RM}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-glow-lime transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save 1RM to Profile</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Hero 1RM Output & Load-Velocity Regression Chart (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className={cn(
              "glass-panel rounded-3xl p-6 border shadow-2xl transition-all",
              calcMode === 'regression' ? "border-cyan-500/40 shadow-glow-cyan" : "border-emerald-500/40 shadow-glow-lime"
            )}>
              
              {/* Output Hero Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {calcMode === 'regression' ? 'Theoretical 1RM & OLS Regression Fit' : 'Direct 1RM & Projected Continuum'}
                </span>

                {calcMode === 'regression' && (
                  <div className={cn(
                    "text-xs font-mono px-3 py-1 rounded-full border font-bold flex items-center gap-1.5",
                    regressionResult.fitColor
                  )}>
                    {regressionResult.rSquared >= 0.95 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>R² = {regressionResult.rSquared.toFixed(3)} ({regressionResult.fitQuality})</span>
                  </div>
                )}
              </div>

              {/* 1RM Hero Display */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 my-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {calcMode === 'regression' ? 'OLS Calculated 1RM' : 'Direct Prescribed 1RM'} ({selectedExercise})
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                      {effective1RM > 0 ? effective1RM : '--'}
                    </span>
                    <span className="text-xl font-bold text-cyan-400 font-mono">KG</span>
                    <span className="text-sm text-slate-400 font-mono">
                      / {effective1RM > 0 ? Math.round(effective1RM * 2.20462) : '--'} LBS
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-xs">
                  <div className="text-slate-400 text-[10px]">LINE SLOPE (m)</div>
                  <div className="text-slate-200 font-bold mt-0.5">{effectiveSlope}</div>
                  <div className="text-slate-400 text-[10px] mt-1">INTERCEPT (V₀)</div>
                  <div className="text-cyan-300 font-bold">{effectiveIntercept} m/s</div>
                </div>
              </div>

              {/* Responsive Load-Velocity Chart */}
              <div className="pt-4 border-t border-slate-800">
                <LoadVelocityChart
                  points={calcMode === 'regression' ? testPoints : []}
                  slope={effectiveSlope}
                  intercept={effectiveIntercept}
                  mvt={mvt}
                  estimated1RM={effective1RM}
                  colorTheme={calcMode === 'regression' ? 'cyan' : 'emerald'}
                />
              </div>

            </div>
          </div>

        </div>

        {/* 4. Granular 15-Step Force-Velocity Continuum Matrix (20% to 100%) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Full-Spectrum Force-Velocity Continuum Matrix (20% — 100% 1RM)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generated from {selectedAthlete.name}'s {calcMode === 'regression' ? 'linear regression profile' : 'direct 1RM normative model'} for <strong>{selectedExercise}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                100% 1RM = {effective1RM} kg
              </span>
            </div>
          </div>

          {/* Granular Table (15 steps) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">% 1RM</th>
                  <th className="py-3.5 px-4">Load (KG)</th>
                  <th className="py-3.5 px-4">Load (LBS)</th>
                  <th className="py-3.5 px-4">Target Velocity (m/s)</th>
                  <th className="py-3.5 px-4">Force-Velocity Zone</th>
                  <th className="py-3.5 px-4">Practical Sprint & Gym Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {trainingZonesTable.map((row) => (
                  <tr key={row.percentage} className="hover:bg-slate-900/50 transition-colors">
                    
                    {/* % 1RM */}
                    <td className="py-3 px-4 font-black text-white text-sm">
                      {row.percentage}%
                    </td>

                    {/* Load in KG */}
                    <td className="py-3 px-4 text-cyan-300 font-bold text-sm">
                      {row.loadKg} <span className="text-xs font-normal text-slate-400">kg</span>
                    </td>

                    {/* Load in LBS */}
                    <td className="py-3 px-4 text-slate-300 font-semibold">
                      {row.loadLbs} <span className="text-xs font-normal text-slate-400">lbs</span>
                    </td>

                    {/* Target Velocity */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {row.predictedVelocityMs.toFixed(2)} m/s
                      </span>
                    </td>

                    {/* Zone Badge with Arabic Sub-label */}
                    <td className="py-3 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                        row.zoneColorClass
                      )}>
                        <span>{row.zoneName}</span>
                        <span className="opacity-75 font-sans">({row.zoneNameAr})</span>
                      </span>
                    </td>

                    {/* Practical Application Notes */}
                    <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                      {row.practicalApplication}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <span>Exercise MVT: <strong className="text-white">{mvt.toFixed(2)} m/s</strong></span>
            <span>Speed Continuum Model: <strong className="text-cyan-300">V = ({effectiveSlope}) · Load + {effectiveIntercept}</strong></span>
          </div>

        </div>

      </main>

      {/* App Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl mt-12 py-5 text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-200 font-bold">PEAK VBT PERFORMANCE HUB</span>
            <span>• Single-Page Dynamic Load-Velocity & Continuum Matrix</span>
          </div>
          <span>Athletes: {athletes.map(a => a.name).join(' • ')}</span>
        </div>
      </footer>

      {/* Add Athlete Modal */}
      <AddAthleteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addAthlete}
      />

      {/* Edit Athlete Modal */}
      <EditAthleteModal
        athlete={editingAthlete}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={updateAthlete}
      />

      {/* Athlete Management Drawer */}
      <AthleteManagementDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        athletes={athletes}
        selectedAthleteId={selectedAthleteId}
        onSelectAthlete={setSelectedAthleteId}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenEditModal={(ath) => {
          setEditingAthlete(ath);
          setIsEditModalOpen(true);
        }}
        onDeleteAthlete={deleteAthlete}
      />

      {/* Supabase Cloud Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Floating Toast Feedback */}
      <ToastContainer />

    </div>
  );
}

export function App() {
  return (
    <AthleteProvider>
      <SinglePageVBTApp />
    </AthleteProvider>
  );
}

export default App;
