import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NDK, { NDKUser, NDKNip07Signer, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { resetWoT } from "@/hooks/useWoT";

interface AuthState {
  user: NDKUser | null;
  publicKey: string | null;
  privateKey: string | null; // For direct key login, though usually discouraged
  isLoggedIn: boolean;
  isLoading: boolean;
  loginType: 'nip07' | 'privateKey' | 'none';
  _hasHydrated: boolean;
  
  setHasHydrated: (state: boolean) => void;
  login: (ndk: NDK) => Promise<void>;
  loginWithPrivateKey: (ndk: NDK, privateKey: string) => Promise<void>;
  generateNewKey: (ndk: NDK) => Promise<string>;
  logout: () => void;
  setUser: (user: NDKUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      publicKey: null,
      privateKey: null,
      isLoggedIn: false,
      isLoading: false,
      loginType: 'none',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setUser: (user) => set({ user }),

      login: async (ndk) => {
        set({ isLoading: true });
        try {
          const signer = new NDKNip07Signer();
          ndk.signer = signer;
          
          const user = await signer.user();
          if (user) {
            user.ndk = ndk;
            await user.fetchProfile();
            set({ 
              user, 
              publicKey: user.pubkey, 
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'nip07'
            });
          }
        } catch (error) {
          console.error("NIP-07 login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithPrivateKey: async (ndk, privateKey) => {
        set({ isLoading: true });
        try {
          const signer = new NDKPrivateKeySigner(privateKey);
          ndk.signer = signer;
          
          const user = await signer.user();
          if (user) {
            user.ndk = ndk;
            await user.fetchProfile();
            set({ 
              user, 
              publicKey: user.pubkey, 
              privateKey: privateKey,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'privateKey'
            });
          }
        } catch (error) {
          console.error("Private key login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      generateNewKey: async (ndk) => {
        const signer = NDKPrivateKeySigner.generate();
        const privateKey = signer.privateKey!;
        const user = await signer.user();
        user.ndk = ndk;
        
        set({
          user,
          publicKey: user.pubkey,
          privateKey,
          isLoggedIn: true,
          isLoading: false,
          loginType: 'privateKey'
        });
        
        return privateKey;
      },

      logout: () => {
        resetWoT();
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          isLoggedIn: false, 
          loginType: 'none' 
        });
      },
    }),
    {
      name: "sapa-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      // We don't want to persist the NDKUser object itself as it's complex and has circular refs
      // Instead, we persist the pubkey and re-instantiate if needed (this part is tricky)
      partialize: (state) => ({ 
        publicKey: state.publicKey, 
        privateKey: state.privateKey, 
        isLoggedIn: state.isLoggedIn, 
        loginType: state.loginType 
      }),
    }
  )
);
