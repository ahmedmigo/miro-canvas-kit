import React, { useState, useEffect } from "react";
import { BaseFormatWidget } from "./BaseFormatWidget";
import { SlidesMenuIcon } from "./FormatIcons";
import { diagramSvgPaths } from "./svg-paths-diagrams";

interface Slide {
  id: string;
  title: string;
  content: string;
  notes?: string;
}

interface SlidesData {
  slides?: Slide[];
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
    <path d={diagramSvgPaths.p72aff80} fill="#E53935" />
  </svg>
);

const IconAddSlides = () => (
   <svg className="size-6" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="#E53935" strokeWidth="2" />
      <path d="M12 9v4M10 11h4" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
   </svg>
);

const IconLayout = () => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none">
     <path d={diagramSvgPaths.p269a700} stroke="#E53935" strokeWidth="2" />
     <path d="M3 9L21 9" stroke="#E53935" strokeWidth="2" />
     <path d={diagramSvgPaths.p154fac80} stroke="#E53935" strokeWidth="2" />
  </svg>
);

function SlidePreview({ slide, isActive, onClick }: { slide: Slide; isActive: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`w-[120px] h-[68px] rounded-lg border-2 cursor-pointer transition-all flex-shrink-0 overflow-hidden ${
        isActive ? 'border-[#E53935] shadow-md' : 'border-[var(--border)] hover:border-[#E53935]/50'
      }`}
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="p-2 h-full flex flex-col">
        <div className="text-[8px] font-semibold truncate text-[var(--foreground)]">{slide.title}</div>
        <div className="text-[6px] text-[var(--muted-foreground)] mt-1 line-clamp-3 overflow-hidden">{slide.content?.replace(/[#*-]/g, '').slice(0, 50)}</div>
      </div>
    </div>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
      } else if (line.trim()) {
        return <p key={i} className="text-sm mb-2">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="flex-1 bg-[var(--background)] rounded-lg border border-[var(--border)] p-8 flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)]">{slide.title}</h2>
      <div className="flex-1 text-[var(--foreground)]">
        {renderContent(slide.content)}
      </div>
      {slide.notes && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold">Notes:</span> {slide.notes}
        </div>
      )}
    </div>
  );
}

export function SlidesFormat({ selected, id, data }: { selected?: boolean; id?: string; data?: SlidesData }) {
  const [slides, setSlides] = useState<Slide[]>(data?.slides || []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (data?.slides && data.slides.length > 0) {
      setSlides(data.slides);
      setActiveIndex(0);
    }
  }, [data?.slides]);

  const hasContent = slides.length > 0;

  return (
    <BaseFormatWidget
       icon={<SlidesMenuIcon />}
       title="Slides"
       selected={selected}
       id={id}
       flowEnabled={data?.flowEnabled}
       prompt={data?.prompt}
       promptTitle={data?.promptTitle}
       flowState={data?.flowState}
       contentKey={slides.length}
       className="w-[802px] h-[451px]"
    >
       <div className="w-[802px] h-[451px] bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] flex flex-col relative overflow-hidden">
          {hasContent ? (
            <>
              <div className="flex-1 p-4 flex gap-4">
                <div className="w-[140px] flex flex-col gap-2 overflow-y-auto">
                  {slides.map((slide, index) => (
                    <SlidePreview 
                      key={slide.id} 
                      slide={slide} 
                      isActive={index === activeIndex}
                      onClick={() => setActiveIndex(index)}
                    />
                  ))}
                </div>
                <SlideView slide={slides[activeIndex]} />
              </div>
              <div className="h-10 border-t border-[var(--border)] flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
                <button 
                  onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  className="px-2 py-1 rounded hover:bg-[var(--accent)] disabled:opacity-50"
                >
                  ←
                </button>
                <span>{activeIndex + 1} / {slides.length}</span>
                <button 
                  onClick={() => setActiveIndex(Math.min(slides.length - 1, activeIndex + 1))}
                  disabled={activeIndex === slides.length - 1}
                  className="px-2 py-1 rounded hover:bg-[var(--accent)] disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-4 border border-[var(--border)] border-dashed rounded-[var(--radius-lg)] pointer-events-none" />
              <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10">
                 <h3 className="font-[family-name:var(--font-noto)] font-semibold text-[14px] text-[var(--muted-foreground)]">
                   Start your presentation: add slides or
                 </h3>
                 <div className="flex gap-2">
                    {[
                      { icon: <IconSparks />, label: "Create with AI" },
                      { icon: <IconAddSlides />, label: "Add slides" },
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
