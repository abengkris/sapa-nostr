"use client";

import React, { useState } from "react";
import { Plus, Trash2, Clock, X } from "lucide-react";
import { PollOption } from "@/lib/actions/poll";

interface PollEditorProps {
  options: PollOption[];
  setOptions: (options: PollOption[]) => void;
  onClose: () => void;
}

export const PollEditor: React.FC<PollEditorProps> = ({ options, setOptions, onClose }) => {
  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { id: String(options.length), label: "" }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      // Re-index
      setOptions(newOptions.map((opt, i) => ({ ...opt, id: String(i) })));
    }
  };

  const updateOption = (index: number, label: string) => {
    const newOptions = [...options];
    newOptions[index].label = label;
    setOptions(newOptions);
  };

  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Poll Options</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 10 && (
        <button
          onClick={addOption}
          className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          <Plus size={18} />
          <span>Add option</span>
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-gray-500">
        <Clock size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Poll ends in 24 hours</span>
      </div>
    </div>
  );
};
