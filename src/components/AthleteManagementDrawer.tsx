import React, { useState } from 'react';
import type { MockAthleteProfile } from '../data/mockAthletes';
import { 
  Users, 
  X, 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AthleteManagementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: MockAthleteProfile[];
  selectedAthleteId: string;
  onSelectAthlete: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (athlete: MockAthleteProfile) => void;
  onDeleteAthlete: (id: string) => void;
}

export const AthleteManagementDrawer: React.FC<AthleteManagementDrawerProps> = ({
  isOpen,
  onClose,
  athletes,
  selectedAthleteId,
  onSelectAthlete,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteAthlete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sportEvent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex justify-end">
      
      {/* Slide-in Panel */}
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl p-6 sm:p-7 animate-fadeIn overflow-y-auto">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Athlete Roster Management</h2>
                <p className="text-xs text-slate-400">{athletes.length} registered athlete profiles</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Add Action Bar */}
          <div className="my-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athlete by name or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Athlete (إضافة لاعب جديد)</span>
            </button>
          </div>

          {/* Athletes List */}
          <div className="space-y-2.5 mt-2">
            {filteredAthletes.map((ath) => {
              const isSelected = ath.id === selectedAthleteId;
              const isCyan = ath.colorAccent === 'cyan';

              return (
                <div
                  key={ath.id}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                    isSelected
                      ? isCyan
                        ? "bg-slate-950 border-cyan-500/60 shadow-glow-cyan"
                        : "bg-slate-950 border-emerald-500/60 shadow-glow-lime"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <div
                    onClick={() => {
                      onSelectAthlete(ath.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black font-mono shrink-0 border",
                      isSelected
                        ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    )}>
                      {ath.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white truncate">{ath.name}</h4>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{ath.sportEvent}</p>
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold">{ath.bodyWeightKg} kg BW</span>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete / Select) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenEditModal(ath);
                      }}
                      title="Edit Profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete athlete profile for "${ath.name}"? This action cannot be undone.`)) {
                          onDeleteAthlete(ath.id);
                        }
                      }}
                      disabled={athletes.length <= 1}
                      title="Delete Profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {!isSelected && (
                      <button
                        onClick={() => {
                          onSelectAthlete(ath.id);
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer ml-1"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAthletes.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                No athletes matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-slate-800 text-center font-mono text-[10px] text-slate-500">
          PEAK VBT Athlete System • Offline Local Storage Active
        </div>

      </div>

    </div>
  );
};
