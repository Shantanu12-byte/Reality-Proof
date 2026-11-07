import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTaskContext } from '@/context/TaskContext';
import { workersData } from '../../data/workersData';
import { Plus, Trash2, CheckCircle2, ShieldCheck, DollarSign, Calendar, MapPin, User, FileText } from 'lucide-react';

export const CreateTaskModal = () => {
  const { isCreateModalOpen, setIsCreateModalOpen, addTask, workers } = useTaskContext();
  const availableWorkers = workers && workers.length > 0 ? workers : workersData;

  const defaultWorker = availableWorkers.find((w) => (w.city || w.location)?.toLowerCase() === 'pune') || availableWorkers[0];
  const defaultWorkerName = defaultWorker?.name || 'Neha Joshi';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: 'Pune',
    address: '',
    workerName: defaultWorkerName,
    budget: '40',
    deadline: '2026-11-06 18:00',
    evidenceList: [
      'Wide-angle storefront display photo',
      'Barcode or serial number scan',
      'GPS Geotag verification within 50m'
    ]
  });

  // Ensure worker selection updates when availableWorkers load or change
  useEffect(() => {
    if (availableWorkers.length > 0) {
      setFormData((prev) => {
        const isCurrentValid = availableWorkers.some((w) => w.name === prev.workerName);
        if (!isCurrentValid || prev.workerName === 'Unassigned Worker' || !prev.workerName) {
          const matchCity = availableWorkers.find(
            (w) => (w.city || w.location)?.toLowerCase() === prev.location?.toLowerCase()
          );
          return {
            ...prev,
            workerName: matchCity ? matchCity.name : availableWorkers[0].name,
          };
        }
        return prev;
      });
    }
  }, [availableWorkers]);

  const handleLocationChange = (newLocation) => {
    const matchCity = availableWorkers.find(
      (w) => (w.city || w.location)?.toLowerCase() === newLocation.toLowerCase()
    );
    setFormData((prev) => ({
      ...prev,
      location: newLocation,
      workerName: matchCity ? matchCity.name : prev.workerName || availableWorkers[0]?.name || '',
    }));
  };

  const [newEvidenceInput, setNewEvidenceInput] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Task name is required';
    } else if (formData.name.trim().length < 3) {
      errs.name = 'Task name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errs.description = 'Operational description is required';
    }

    if (!formData.location) {
      errs.location = 'Location is required';
    }

    if (!formData.budget || isNaN(Number(formData.budget)) || Number(formData.budget) <= 0) {
      errs.budget = 'Please enter a valid payout budget in USD';
    }

    if (!formData.deadline) {
      errs.deadline = 'Completion deadline is required';
    }

    if (formData.evidenceList.length === 0) {
      errs.evidence = 'At least one required evidence item must be defined';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    addTask({
      name: formData.name.trim(),
      description: formData.description.trim(),
      location: formData.location,
      address: formData.address.trim() || `${formData.location} Commercial Zone`,
      workerName: formData.workerName,
      budget: `$${Number(formData.budget).toFixed(2)}`,
      deadline: formData.deadline,
      requiredEvidence: formData.evidenceList
    });

    setFormData({
      name: '',
      description: '',
      location: 'Pune',
      address: '',
      workerName: 'Neha Joshi',
      budget: '40',
      deadline: '2026-11-06 18:00',
      evidenceList: [
        'Wide-angle storefront display photo',
        'Barcode or serial number scan',
        'GPS Geotag verification within 50m'
      ]
    });
    setErrors({});
    setIsCreateModalOpen(false);
  };

  const addEvidenceItem = () => {
    if (newEvidenceInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        evidenceList: [...prev.evidenceList, newEvidenceInput.trim()]
      }));
      setNewEvidenceInput('');
      if (errors.evidence) {
        setErrors((prev) => ({ ...prev, evidence: null }));
      }
    }
  };

  const removeEvidenceItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      evidenceList: prev.evidenceList.filter((_, i) => i !== index)
    }));
  };

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      title="Create Verification Task"
      subtitle="Define physical inspection parameters, evidence requirements and worker assignment"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {/* Task Name */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">
            Task Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Retail Display Endcap Audit"
            className={`w-full bg-[#F8FAFC] border rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
              errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-[#E2E8F0] focus:border-[#6C5DD3] focus:ring-2 focus:ring-purple-500/10'
            }`}
          />
          {errors.name && (
            <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">
            Task Description & Instructions <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Specify verification instructions for the field worker and AI vision inspection engine..."
            className={`w-full bg-[#F8FAFC] border rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
              errors.description ? 'border-rose-400 ring-2 ring-rose-100' : 'border-[#E2E8F0] focus:border-[#6C5DD3] focus:ring-2 focus:ring-purple-500/10'
            }`}
          />
          {errors.description && (
            <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.description}</p>
          )}
        </div>

        {/* Location & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Operational Zone / City <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#6C5DD3] focus:bg-white font-medium"
            >
              <option value="Pune">Pune Metro</option>
              <option value="Mumbai">Mumbai MMR</option>
              <option value="Nashik">Nashik Industrial Zone</option>
              <option value="Nagpur">Nagpur Logistics Hub</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Facility Address / Site Landmark
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Phoenix Marketcity, Viman Nagar"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5DD3] focus:bg-white"
            />
          </div>
        </div>

        {/* Worker & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                Assign Field Worker <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#6C5DD3] font-bold">
                {availableWorkers.length} Registered
              </span>
            </div>
            <select
              value={formData.workerName || (availableWorkers[0]?.name || '')}
              onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-[#6C5DD3] focus:bg-white font-medium"
            >
              {availableWorkers.length === 0 ? (
                <option value="">No registered inspectors available</option>
              ) : (
                availableWorkers.map((w) => {
                  const isLocal = (w.city || w.location)?.toLowerCase() === formData.location?.toLowerCase();
                  return (
                    <option key={w.workerId || w.id || w._id} value={w.name}>
                      {w.name} ({w.workerId || 'INSP'}) — {w.city || w.location} • ★ {w.rating || 5.0} {isLocal ? '📍 Local' : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Worker Payout Budget (USD) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">
                $
              </span>
              <input
                type="number"
                step="5"
                min="10"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className={`w-full bg-[#F8FAFC] border rounded-xl pl-8 pr-4 py-2.5 text-slate-900 focus:outline-none focus:bg-white font-mono font-bold ${
                  errors.budget ? 'border-rose-400' : 'border-[#E2E8F0] focus:border-[#6C5DD3]'
                }`}
              />
            </div>
            {errors.budget ? (
              <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.budget}</p>
            ) : (
              <p className="text-[#6C5DD3] text-[10px] mt-1 font-medium">✓ Pre-authorized via PayPal Orders v2</p>
            )}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">
            Completion Deadline <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            placeholder="YYYY-MM-DD HH:MM (e.g. 2026-11-06 18:00)"
            className={`w-full bg-[#F8FAFC] border rounded-xl px-4 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white ${
              errors.deadline ? 'border-rose-400' : 'border-[#E2E8F0] focus:border-[#6C5DD3]'
            }`}
          />
          {errors.deadline && (
            <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.deadline}</p>
          )}
        </div>

        {/* Required Evidence Checklist */}
        <div className="pt-3 border-t border-[#EEF2F6]">
          <label className="block font-bold text-slate-700 mb-1">
            Required Evidence Checklist <span className="text-rose-500">*</span>
          </label>
          <p className="text-slate-500 text-[11px] mb-2.5 font-medium">
            The AI verification pipeline validates each uploaded asset against these specifications.
          </p>

          <div className="space-y-2 mb-2.5">
            {formData.evidenceList.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] text-xs font-medium"
              >
                <span className="flex items-center gap-2 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-[#6C5DD3]" />
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => removeEvidenceItem(index)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {errors.evidence && (
            <p className="text-rose-500 text-[11px] mb-2 font-medium">{errors.evidence}</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newEvidenceInput}
              onChange={(e) => setNewEvidenceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEvidenceItem();
                }
              }}
              placeholder="e.g. Temperature sensor LCD display readout"
              className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5DD3] focus:bg-white text-xs"
            />
            <button
              type="button"
              onClick={addEvidenceItem}
              className="px-4 py-2 bg-purple-50 hover:bg-[#6C5DD3] text-[#6C5DD3] hover:text-white rounded-xl border border-purple-200 hover:border-[#6C5DD3] flex items-center gap-1.5 font-bold text-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[#EEF2F6] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5"
          >
            Dispatch & Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
};
