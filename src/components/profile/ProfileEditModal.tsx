"use client";

import React, { useState, useEffect } from "react";
import { X, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { ProfileMetadata } from "@/hooks/useProfile";
import { updateProfile } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import Image from "next/image";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: ProfileMetadata | null;
  onSuccess?: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSuccess
}) => {
  const { ndk } = useNDK();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileMetadata>({
    name: "",
    displayName: "",
    about: "",
    picture: "",
    banner: "",
    website: "",
    nip05: "",
    lud16: "",
    pronouns: "",
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || "",
        displayName: currentProfile.displayName || "",
        about: currentProfile.about || "",
        picture: currentProfile.picture || "",
        banner: currentProfile.banner || "",
        website: currentProfile.website || "",
        nip05: currentProfile.nip05 || "",
        lud16: currentProfile.lud16 || "",
        pronouns: currentProfile.pronouns || "",
      });
    }
  }, [currentProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk) return;

    setLoading(true);
    try {
      const success = await updateProfile(ndk, formData);
      if (success) {
        onSuccess?.();
        onClose();
      } else {
        alert("Failed to update profile. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while updating profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-black w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold">Edit Profile</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full font-bold transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Save"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Banner Preview & Input */}
          <div className="relative h-40 bg-gray-200 dark:bg-gray-800 group">
            {formData.banner ? (
              <Image src={formData.banner} alt="Banner" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="text-white" size={32} />
                <input
                  type="text"
                  name="banner"
                  placeholder="Banner URL"
                  value={formData.banner}
                  onChange={handleChange}
                  className="bg-black/60 text-white text-xs p-2 rounded border border-white/20 w-64 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar Preview & Input */}
            <div className="relative -mt-12 mb-6 group inline-block">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-md">
                <Image 
                  src={formData.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder`} 
                  alt="Avatar" 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                <Camera className="text-white" size={24} />
              </div>
              <div className="mt-2 absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                <input
                  type="text"
                  name="picture"
                  placeholder="Avatar URL"
                  value={formData.picture}
                  onChange={handleChange}
                  className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 text-sm p-2 rounded w-full shadow-lg outline-none"
                />
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="e.g. Satoshi Nakamoto"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username (@name)</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. satoshi"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</label>
                <textarea
                  name="about"
                  rows={3}
                  value={formData.about}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Pronouns</label>
                  <input
                    type="text"
                    name="pronouns"
                    value={formData.pronouns}
                    onChange={handleChange}
                    placeholder="they/them"
                    className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">NIP-05 Verification</label>
                <input
                  type="text"
                  name="nip05"
                  value={formData.nip05}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
