"use client";

import { useContext } from "react";
import { NDKContext, NDKContextType } from "@/providers/NDKProvider";

export const useNDK = (): NDKContextType => {
  const context = useContext(NDKContext);
  if (context === undefined) {
    throw new Error("useNDK must be used within an NDKProvider");
  }
  return context;
};
