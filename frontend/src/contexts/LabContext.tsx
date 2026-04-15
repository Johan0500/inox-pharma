import { createContext, useContext, useState, ReactNode } from "react";

interface LabContextType {
  selectedLab: string;
  setSelectedLab: (lab: string) => void;
  labName: string;
  labColor: string;
}

const LAB_NAMES: Record<string, string> = {
  "lic-pharma": "LIC PHARMA",
  "croient":    "CROIENT",
  "all":        "VUE GLOBALE",
};

const LAB_COLORS: Record<string, string> = {
  "lic-pharma": "#065f46",
  "croient":    "#1e40af",
  "all":        "#064e3b",
};

const LabContext = createContext<LabContextType>({
  selectedLab:    "all",
  setSelectedLab: () => {},
  labName:        "VUE GLOBALE",
  labColor:       "#064e3b",
});

export function LabProvider({ children, initialLab = "all" }: { children: ReactNode; initialLab?: string }) {
  const [selectedLab, setSelectedLab] = useState(initialLab);

  return (
    <LabContext.Provider value={{
      selectedLab,
      setSelectedLab,
      labName:  LAB_NAMES[selectedLab]  || selectedLab,
      labColor: LAB_COLORS[selectedLab] || "#064e3b",
    }}>
      {children}
    </LabContext.Provider>
  );
}

export const useLab = () => useContext(LabContext);
export default LabContext;
