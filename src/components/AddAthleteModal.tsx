import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

interface AddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, sportEvent: string, bodyWeightKg: number, notes?: string) => void;
}

export const AddAthleteModal: React.FC<AddAthleteModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [sportEvent, setSportEvent] = useState('');
  const [bodyWeight, setBodyWeight] = useState<number>(75);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd(
      name.trim(),
      sportEvent.trim() || 'Track & Field Athlete',
      Number(bodyWeight) || 75,
      notes.trim() || 'Active Training Microcycle'
    );
    setName('');
    setSportEvent('');
    setBodyWeight(75);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add New Athlete Profile</h2>
              <p className="text-xs text-slate-400">Create a personalized VBT profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Athlete Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Omar Hassan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Sport / Track Event</label>
            <input
              type="text"
              placeholder="e.g. 100m, 200m Sprinter / Decathlon"
              value={sportEvent}
              onChange={(e) => setSportEvent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Body Weight (kg) *</label>
            <input
              type="number"
              step="0.5"
              min="35"
              max="200"
              required
              value={bodyWeight}
              onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Coaching Notes / Block Info</label>
            <textarea
              rows={2}
              placeholder="e.g. Speed-Strength Peaking Block, Target Trials..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan transition-all cursor-pointer"
            >
              Create Athlete
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
