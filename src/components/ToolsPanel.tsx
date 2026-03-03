import React, { useState } from "react";
import {
  Box,
  Input,
  Tabs,
  Heading,
} from "@mirohq/design-system";
import {
  IconMagnifyingGlass,
  IconStickyNote,
  IconTextT,
  IconShapesLines,
  IconPenTip,
  IconChatLinesTwo,
  IconFrame,
  IconSquaresThree,
  IconCard,
  IconFlipCard,
  IconGrid,
  IconImage,
} from "@mirohq/design-system-icons";
import { styled } from "../lib/stitches.config";
import svgPaths from "../imports/svg-wi134zte8t";

const PanelWrapper = styled("div", {
  position: "fixed",
  left: "64px",
  top: "64px",
  bottom: "8px",
  width: "480px",
  zIndex: 1000,
});

const PanelContent = styled("div", {
  width: "100%",
  height: "100%",
  padding: "16px",
  backgroundColor: "var(--background)",
  borderRadius: "8px",
  boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.12)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  border: "1px solid var(--border)",
  boxSizing: "border-box",
});

const SearchWrapper = styled("div", {
  marginBottom: "20px",
});

const TabsWrapper = styled("div", {
  marginBottom: "20px",
});

const SectionHeading = styled(Heading, {
  marginTop: "8px",
  marginBottom: "12px",
  paddingLeft: "6px",
  paddingRight: "6px",
});

const ToolsList = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "0",
});

const ToolItem = styled("button", {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 6px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "transparent",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  width: "100%",
  textAlign: "left",

  "&:hover": {
    backgroundColor: "#f3f4f6",
  },
});

const ToolIconWrapper = styled("div", {
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: "4px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--background)",

  "& svg": {
    width: "24px",
    height: "24px",
  },
});

const ToolTextContainer = styled("div", {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const ToolName = styled("span", {
  fontSize: "14px",
  fontWeight: 500,
  color: "#1a1a1a",
  lineHeight: "20px",
});

const ToolDescription = styled("span", {
  fontSize: "12px",
  color: "#6b7280",
  lineHeight: "16px",
});

const BetaBadge = styled("span", {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--accent)",
  backgroundColor: "var(--accent-50)",
  padding: "2px 6px",
  borderRadius: "4px",
  marginLeft: "8px",
});

// Icons from FormatsMenu
const DocumentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.pf474100} fill="#0E9DCD" fillRule="evenodd" />
  </svg>
);

const DiagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.p23391d80} fill="#DA792B" fillRule="evenodd" />
  </svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.p8fe9080} fill="#0FA83C" fillRule="evenodd" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.pdbac000} fill="#0FA83C" fillRule="evenodd" />
    <path clipRule="evenodd" d={svgPaths.p2f293d00} fill="#0FA83C" fillRule="evenodd" />
    <path clipRule="evenodd" d={svgPaths.p272d0a80} fill="#0FA83C" fillRule="evenodd" />
  </svg>
);

const KanbanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.p2f85fc00} fill="#0FA83C" fillRule="evenodd" />
  </svg>
);

const PrototypeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={svgPaths.p9f0c900} fill="#8167E5" />
  </svg>
);

const SlidesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={svgPaths.p4adad70} fill="#DB4F4F" />
    <path d={svgPaths.p2421c780} fill="#DB4F4F" />
    <path d={svgPaths.p4467700} fill="#DB4F4F" />
    <path d={svgPaths.p2242f400} fill="#DB4F4F" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1" fill="var(--foreground)" />
    <rect x="9" y="2" width="5" height="5" rx="1" fill="var(--foreground)" />
    <rect x="2" y="9" width="5" height="5" rx="1" fill="var(--foreground)" />
    <rect x="9" y="9" width="5" height="5" rx="1" fill="var(--foreground)" />
  </svg>
);

const MindMapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" fill="var(--foreground)" />
    <circle cx="3" cy="3" r="1.5" fill="var(--foreground)" />
    <circle cx="13" cy="3" r="1.5" fill="var(--foreground)" />
    <circle cx="3" cy="13" r="1.5" fill="var(--foreground)" />
    <circle cx="13" cy="13" r="1.5" fill="var(--foreground)" />
    <line x1="6.5" y1="7" x2="4" y2="4" stroke="var(--foreground)" strokeWidth="1.5" />
    <line x1="9.5" y1="7" x2="12" y2="4" stroke="var(--foreground)" strokeWidth="1.5" />
    <line x1="6.5" y1="9" x2="4" y2="12" stroke="var(--foreground)" strokeWidth="1.5" />
    <line x1="9.5" y1="9" x2="12" y2="12" stroke="var(--foreground)" strokeWidth="1.5" />
  </svg>
);

interface ToolsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (tool: string) => void;
  anchorEl?: HTMLElement | null;
}

export function ToolsPanel({ isOpen, onOpenChange, onSelect, anchorEl }: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<"tools" | "marketplace">("tools");
  const [searchQuery, setSearchQuery] = useState("");

  const handleToolClick = (tool: string) => {
    onSelect?.(tool);
    onOpenChange(false);
  };

  const formatTools = [
    {
      id: "diagram",
      name: "Diagram",
      description: "Visualize processes & systems with a diagram",
      icon: <DiagramIcon />,
    },
    {
      id: "doc",
      name: "Doc",
      description: "Create a document on the canvas",
      icon: <DocumentIcon />,
    },
    {
      id: "prototype",
      name: "Prototype",
      description: "Visualize concepts and build interactive flows",
      icon: <PrototypeIcon />,
    },
    {
      id: "slides",
      name: "Slides",
      description: "Showcase your work with slides",
      icon: <SlidesIcon />,
    },
    {
      id: "table",
      name: "Table",
      description: "Structure your data using a table",
      icon: <TableIcon />,
    },
    {
      id: "timeline",
      name: "Timeline",
      description: "Plan your work using a timeline",
      icon: <TimelineIcon />,
    },
    {
      id: "kanban",
      name: "Kanban",
      description: "Visualize your workflows with multi-view options",
      icon: <KanbanIcon />,
    },
    {
      id: "dashboard",
      name: "Dashboard",
      description: "Visualize your data in custom layouts",
      icon: <DashboardIcon />,
      beta: true,
    },
  ];

  const essentialTools = [
    {
      id: "pen",
      name: "Pen",
      description: "Create freehand drawings",
      icon: <IconPenTip size={24} />,
    },
    {
      id: "stickyNote",
      name: "Sticky note",
      description: "Add notes to your board",
      icon: <IconStickyNote size={24} />,
    },
    {
      id: "card",
      name: "Card",
      description: "Organize and assign work",
      icon: <IconCard size={24} />,
    },
    {
      id: "codeBlock",
      name: "Code block",
      description: "Code with syntax highlighting",
      icon: <IconTextT size={24} />,
    },
    {
      id: "comment",
      name: "Comment",
      description: "Boost collaboration with comments",
      icon: <IconChatLinesTwo size={24} />,
    },
    {
      id: "flipCard",
      name: "Flip card",
      description: "Double-sided cards for revealing content",
      icon: <IconFlipCard size={24} />,
    },
    {
      id: "frame",
      name: "Frame",
      description: "Add structure to the board",
      icon: <IconFrame size={24} />,
    },
    {
      id: "grid",
      name: "Grid",
      description: "Organize information in a grid",
      icon: <IconGrid size={24} />,
    },
    {
      id: "image",
      name: "Image",
      description: "Upload and display images",
      icon: <IconImage size={24} />,
    },
    {
      id: "mindMap",
      name: "Mind map",
      description: "Brainstorm ideas visually",
      icon: <MindMapIcon />,
    },
  ];

  const filteredFormatTools = formatTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEssentialTools = essentialTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <PanelWrapper>
        <PanelContent>
          <SearchWrapper>
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            >
              <Input.IconSlot>
                <IconMagnifyingGlass />
              </Input.IconSlot>
            </Input>
          </SearchWrapper>

          <TabsWrapper>
            <Tabs defaultValue="tools" variant="buttons" value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Trigger value="tools">Tools</Tabs.Trigger>
                <Tabs.Trigger value="marketplace">Marketplace</Tabs.Trigger>
              </Tabs.List>
            </Tabs>
          </TabsWrapper>

          {activeTab === "tools" && (
            <>
              <SectionHeading level={4}>Formats</SectionHeading>
              <ToolsList>
                {filteredFormatTools.map((tool) => (
                  <ToolItem
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <ToolIconWrapper>{tool.icon}</ToolIconWrapper>
                    <ToolTextContainer>
                      <ToolName>
                        {tool.name}
                        {tool.beta && <BetaBadge>Beta</BetaBadge>}
                      </ToolName>
                      <ToolDescription>{tool.description}</ToolDescription>
                    </ToolTextContainer>
                  </ToolItem>
                ))}
              </ToolsList>

              <SectionHeading level={4}>Essentials</SectionHeading>
              <ToolsList>
                {filteredEssentialTools.map((tool) => (
                  <ToolItem
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <ToolIconWrapper>{tool.icon}</ToolIconWrapper>
                    <ToolTextContainer>
                      <ToolName>{tool.name}</ToolName>
                      <ToolDescription>{tool.description}</ToolDescription>
                    </ToolTextContainer>
                  </ToolItem>
                ))}
              </ToolsList>
            </>
          )}

          {activeTab === "marketplace" && (
            <Box css={{ padding: "32px", textAlign: "center" }}>
              <ToolDescription css={{ textAlign: "center" }}>
                Marketplace content coming soon...
              </ToolDescription>
            </Box>
          )}
        </PanelContent>
      </PanelWrapper>
    </>
  );
}
