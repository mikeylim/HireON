"use client";

import { createContext, useContext, useState } from "react";
import type { PreviewJob } from "@/lib/types/preview";

// Keeps scrape preview results alive across page navigation.
// Without this, navigating away from All Jobs and back would lose your results.
// Matches React's useState signature so callers can pass a value or an updater function
type SetPreview = React.Dispatch<React.SetStateAction<PreviewJob[]>>;

interface PreviewContextType {
  preview: PreviewJob[];
  setPreview: SetPreview;
}

const PreviewContext = createContext<PreviewContextType>({
  preview: [],
  setPreview: () => {},
});

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<PreviewJob[]>([]);
  return (
    <PreviewContext.Provider value={{ preview, setPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  return useContext(PreviewContext);
}
