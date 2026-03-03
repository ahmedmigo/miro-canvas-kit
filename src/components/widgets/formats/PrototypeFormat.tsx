import React, { useState, useEffect } from "react";
import { BaseFormatWidget } from "./BaseFormatWidget";
import { PrototypeMenuIcon } from "./FormatIcons";
import { diagramSvgPaths } from "./svg-paths-diagrams";

interface ScreenElement {
  type: 'header' | 'button' | 'input' | 'text' | 'image' | 'list';
  label: string;
  action?: string;
}

interface Screen {
  id: string;
  name: string;
  description?: string;
  elements: ScreenElement[];
}

interface PrototypeData {
  title?: string;
  screens?: Screen[];
  flowEnabled?: boolean;
  prompt?: string;
  promptTitle?: string;
  flowState?: {
    status: "idle" | "running" | "success" | "error";
    error?: string;
  };
}

const IconSparks = () => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none">
    <path d={diagramSvgPaths.p72aff80} fill="#8167E5" />
  </svg>
);

const IconAddScreens = () => (
   <svg className="size-6" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="#8167E5" strokeWidth="2" />
      <path d="M12 10v4M10 12h4" stroke="#8167E5" strokeWidth="2" strokeLinecap="round" />
   </svg>
);

const IconLayout = () => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none">
     <path d={diagramSvgPaths.p269a700} stroke="#8167E5" strokeWidth="2" />
     <path d="M3 9L21 9" stroke="#8167E5" strokeWidth="2" />
     <path d={diagramSvgPaths.p154fac80} stroke="#8167E5" strokeWidth="2" />
  </svg>
);

function ScreenPreview({ screen, isActive, onClick }: { screen: Screen; isActive: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`w-[80px] h-[140px] rounded-lg border-2 cursor-pointer transition-all flex-shrink-0 overflow-hidden ${
        isActive ? 'border-[#8167E5] shadow-md' : 'border-[var(--border)] hover:border-[#8167E5]/50'
      }`}
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="h-4 bg-[#8167E5]/20 border-b border-[var(--border)]" />
      <div className="p-1 h-full flex flex-col gap-1">
        <div className="text-[6px] font-semibold truncate text-[var(--foreground)]">{screen.name}</div>
        {screen.elements.slice(0, 4).map((el, i) => (
          <div key={i} className="h-2 bg-[var(--accent)] rounded-sm" />
        ))}
      </div>
    </div>
  );
}

function ElementRenderer({ element, onNavigate }: { element: ScreenElement; onNavigate?: (screenId: string) => void }) {
  const handleClick = () => {
    if (element.action?.startsWith('navigateTo:') && onNavigate) {
      onNavigate(element.action.split(':')[1]);
    }
  };

  switch (element.type) {
    case 'header':
      return (
        <div className="py-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-center text-[var(--foreground)]">{element.label}</h3>
        </div>
      );
    case 'button':
      return (
        <button 
          onClick={handleClick}
          className="w-full py-3 px-4 bg-[#8167E5] text-white rounded-lg font-semibold hover:bg-[#6b52d9] transition-colors"
        >
          {element.label}
        </button>
      );
    case 'input':
      return (
        <input 
          type="text"
          placeholder={element.label}
          className="w-full py-3 px-4 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
          readOnly
        />
      );
    case 'text':
      return (
        <p className="text-sm text-[var(--muted-foreground)] py-2">{element.label}</p>
      );
    case 'image':
      return (
        <div className="w-full h-32 bg-[var(--accent)] rounded-lg flex items-center justify-center">
          <span className="text-[var(--muted-foreground)]">{element.label}</span>
        </div>
      );
    case 'list':
      return (
        <div className="w-full space-y-2">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">{element.label}</div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[var(--accent)] rounded-lg" />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function ScreenView({ screen, onNavigate }: { screen: Screen; onNavigate: (screenId: string) => void }) {
  return (
    <div className="w-[280px] h-full bg-[var(--background)] rounded-2xl border-4 border-[#333] overflow-hidden flex flex-col shadow-xl">
      <div className="h-6 bg-[#333] flex items-center justify-center">
        <div className="w-16 h-1 bg-[#555] rounded-full" />
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {screen.elements.map((el, i) => (
          <ElementRenderer key={i} element={el} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="h-4 bg-[#333]" />
    </div>
  );
}

export function PrototypeFormat({ selected, id, data }: { selected?: boolean; id?: string; data?: PrototypeData }) {
  const [prototype, setPrototype] = useState<PrototypeData>(data || {});
  const [activeScreenId, setActiveScreenId] = useState<string>('');

  useEffect(() => {
    if (data?.screens && data.screens.length > 0) {
      setPrototype(data);
      setActiveScreenId(data.screens[0].id);
    }
  }, [data]);

  const hasContent = prototype.screens && prototype.screens.length > 0;
  const activeScreen = prototype.screens?.find(s => s.id === activeScreenId);

  const handleNavigate = (screenId: string) => {
    if (prototype.screens?.some(s => s.id === screenId)) {
      setActiveScreenId(screenId);
    }
  };

  return (
    <BaseFormatWidget
       icon={<PrototypeMenuIcon />}
       title="Prototype"
       selected={selected}
       id={id}
       flowEnabled={data?.flowEnabled}
       prompt={data?.prompt}
       promptTitle={data?.promptTitle}
       flowState={data?.flowState}
       contentKey={prototype.screens?.length || 0}
       className="w-[802px] h-[451px]"
    >
       <div className="w-[802px] h-[451px] bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] flex flex-col items-center justify-center relative overflow-hidden">
          {hasContent ? (
            <div className="w-full h-full flex">
              <div className="w-[120px] border-r border-[var(--border)] p-2 flex flex-col gap-2 overflow-y-auto">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2 px-1">
                  {prototype.title || 'Screens'}
                </div>
                {prototype.screens?.map((screen) => (
                  <ScreenPreview 
                    key={screen.id} 
                    screen={screen} 
                    isActive={screen.id === activeScreenId}
                    onClick={() => setActiveScreenId(screen.id)}
                  />
                ))}
              </div>
              <div className="flex-1 flex items-center justify-center bg-[var(--accent)]/30 p-4">
                {activeScreen && <ScreenView screen={activeScreen} onNavigate={handleNavigate} />}
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-4 border border-[var(--border)] border-dashed rounded-[var(--radius-lg)] pointer-events-none" />
              <div className="flex flex-col items-center gap-8 z-10 pointer-events-auto">
                 <h3 className="font-[family-name:var(--font-noto)] font-semibold text-[14px] text-[var(--muted-foreground)]">
                   Start your prototype: drag screens or
                 </h3>
                 <div className="flex gap-2">
                    {[
                      { icon: <IconSparks />, label: "Create with AI" },
                      { icon: <IconAddScreens />, label: "Add screens" },
                      { icon: <IconLayout />, label: "Start with a template" }
                    ].map((item, index) => (
                      <div key={index} className="group flex flex-col items-center justify-center gap-4 w-[198px] py-8 px-4 bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--border)] cursor-pointer">
                         <div className="group-hover:scale-110 transition-transform duration-200">
                           {item.icon}
                         </div>
                         <span className="font-[family-name:var(--font-noto)] font-semibold text-[14px] text-[var(--foreground)] text-center leading-none">
                           {item.label}
                         </span>
                      </div>
                    ))}
                 </div>
              </div>
            </>
          )}
       </div>
    </BaseFormatWidget>
  );
}
