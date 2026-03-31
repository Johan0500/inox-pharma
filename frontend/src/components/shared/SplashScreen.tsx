import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<"logo" | "text" | "out">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 600);
    const t2 = setTimeout(() => setPhase("out"),  2800);
    const t3 = setTimeout(() => onComplete(),      3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500
      ${phase === "out" ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%)" }}
    >
      {/* Cercles décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position:"absolute", width:500, height:500,
          borderRadius:"50%", top:-100, right:-100,
          background:"rgba(255,255,255,0.03)",
          animation:"pulse 3s ease-in-out infinite"
        }}/>
        <div style={{
          position:"absolute", width:300, height:300,
          borderRadius:"50%", bottom:-50, left:-50,
          background:"rgba(255,255,255,0.05)",
          animation:"pulse 2s ease-in-out infinite 0.5s"
        }}/>
        <div style={{
          position:"absolute", width:200, height:200,
          borderRadius:"50%", top:"30%", left:"10%",
          background:"rgba(255,255,255,0.03)",
          animation:"pulse 4s ease-in-out infinite 1s"
        }}/>
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div style={{
          opacity: phase === "logo" ? 0 : 1,
          transform: phase === "logo" ? "scale(0.5)" : "scale(1)",
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <div style={{
            width: 120, height: 120, borderRadius: 32,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            border: "2px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}>
            <span style={{ fontSize: 56 }}>🏥</span>
          </div>
        </div>

        {/* Texte */}
        <div style={{
          opacity:    phase === "text" || phase === "out" ? 1 : 0,
          transform:  phase === "text" || phase === "out" ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease 0.2s",
          textAlign:  "center",
        }}>
          <h1 style={{
            fontFamily:  "'Georgia', serif",
            fontSize:    36,
            fontWeight:  700,
            color:       "white",
            letterSpacing: 4,
            margin:      0,
            textShadow:  "0 2px 20px rgba(0,0,0,0.3)",
          }}>
            INOX PHARMA
          </h1>
          <p style={{
            fontFamily:  "system-ui, sans-serif",
            fontSize:    13,
            color:       "rgba(255,255,255,0.7)",
            letterSpacing: 3,
            marginTop:   8,
            textTransform: "uppercase",
          }}>
            Côte d'Ivoire
          </p>
        </div>

        {/* Barre de chargement */}
        <div style={{
          opacity:    phase === "text" || phase === "out" ? 1 : 0,
          transition: "opacity 0.4s ease 0.5s",
          width:      160,
        }}>
          <div style={{
            height: 3, borderRadius: 4,
            background: "rgba(255,255,255,0.2)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "white",
              animation: "loadBar 2.2s ease forwards",
            }}/>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes loadBar {
          0% { width: 0%; }
          30% { width: 40%; }
          60% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}