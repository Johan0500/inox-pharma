import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";

interface LabContextType {
  selectedLab:    string;
  setSelectedLab: (lab: string) => void;
  labName:        string;
  labColor:       string;
}

const FIXED_NAMES: Record<string, string> = {
  "lic-pharma": "LIC PHARMA",
  "croient":    "CROIENT",
  "all":        "VUE GLOBALE",
};
const FIXED_COLORS: Record<string, string> = {
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
  const [selectedLab,  setSelectedLab]  = useState(initialLab);
  const [dynamicLabs,  setDynamicLabs]  = useState<Record<string, { name: string; color: string }>>({});

  // Charger les labos dynamiques une seule fois
  useEffect(() => {
    api.get("/laboratories").then(r => {
      const map: Record<string, { name: string; color: string }> = {};
      (r.data || []).forEach((l: any) => {
        const key = l.name.toLowerCase();
        map[key] = { name: l.name.toUpperCase(), color: l.color || "#064e3b" };
      });
      setDynamicLabs(map);
    }).catch(() => {});
  }, []);

  const labName  = FIXED_NAMES[selectedLab]  || dynamicLabs[selectedLab]?.name  || selectedLab.toUpperCase();
  const labColor = FIXED_COLORS[selectedLab] || dynamicLabs[selectedLab]?.color || "#064e3b";

  return (
    <LabContext.Provider value={{ selectedLab, setSelectedLab, labName, labColor }}>
      {children}
    </LabContext.Provider>
  );
}

export const useLab = () => useContext(LabContext);
export default LabContext;
