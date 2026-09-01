import React, { useState, useEffect } from 'react';
import type { MockAthleteProfile } from '../data/mockAthletes';
import { UserCheck, X } from 'lucide-react';

interface EditAthleteModalProps {
  athlete: MockAthleteProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: MockAthleteProfile) => void;
}

export const EditAthleteModal: React.FC<EditAthleteModalProps> = ({
  athlete,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(athlete.name);
  const [sportEvent, setSportEvent] = useState(athlete.sportEvent);
  const [bodyWeight, setBodyWeight] = useState<number>(athlete.bodyWeightKg);
  const [notes, setNotes] = useState(athlete.notes || '');

  useEffect(() => {
    setName(athlete.name);
    setSportEvent(athlete.sportEvent);
    setBodyWeight(athlete.bodyWeightKg);
    setNotes(athlete.notes || '');
  }, [athlete]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || athlete.avatarInitials;

    const updated: MockAthleteProfile = {
      ...athlete,
      name: name.trim(),
      sportEvent: sportEvent.trim() || 'Track Athlete',
      bodyWeightKg: Number(bodyWeight) || 75,
      notes: notes.trim(),
      avatarInitials: initials,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Athlete Profile</h2>
              <p className="text-xs text-slate-400">Update biometrics and metadata</p>
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
            <label className="block text-slate-300 font-bold mb-1">Athlete Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Sport / Track Event</label>
            <input
              type="text"
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
            <label className="block text-slate-300 font-bold mb-1">Coaching Notes / Focus</label>
            <textarea
              rows={2}
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
              Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
