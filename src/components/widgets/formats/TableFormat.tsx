import React, { useState, useEffect, useRef, useCallback } from "react";
import { useReactFlow } from "reactflow";
import { cn } from "../../ui/utils";
import { BaseFormatWidget } from "./BaseFormatWidget";
import {
  IconTable,
  IconSync,
  IconFunnel,
  IconArrowsDownUp,
  IconRectanglesTwoLinesFour,
  IconEyeOpenSlash,
  IconBookmark,
  IconTextLinesThree,
  IconSelect,
  IconLink,
  IconUser,
  IconPlus,
  TableMenuIcon,
  IconHash,
  IconList,
  IconCheckSquare,
  IconSigma,
  IconArrowUpRight,
  IconTag,
  IconCalendarBlank,
  IconArrowRight,
  IconArrowLeft,
  IconListChecks
} from "./FormatIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../../ui/dropdown-menu";

// --- Types ---

type ColumnType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiSelect' 
  | 'date' 
  | 'person' 
  | 'link' 
  | 'tags' 
  | 'blocking' 
  | 'blockedBy'
  | 'parent'
  | 'child'
  | 'formula'
  | 'relatesTo';

interface Column {
  id: string;
  type: ColumnType;
  label: string;
  width: number; // in px
  isPrimary?: boolean;
  options?: string[]; // for select/multiSelect
}

interface Row {
  id: string;
  [key: string]: any; // columnId -> value
}

interface TableData {
  columns: Column[];
  rows: Row[];
}

// --- Constants ---

const DEFAULT_COLUMNS: Column[] = [
  { id: 'c1', type: 'text', label: 'User Feedback', width: 220, isPrimary: true },
  { id: 'c2', type: 'text', label: 'Description', width: 200 },
  { id: 'c3', type: 'select', label: 'Status', width: 140, options: ['Pending Review', 'Under Review', 'Feedback Type'] },
  { id: 'c4', type: 'link', label: 'Link', width: 160 },
  { id: 'c5', type: 'person', label: 'Owner', width: 140 },
];

const DEFAULT_ROWS: Row[] = [
  { id: 'r1', c1: 'Insights from User Feedback', c2: 'Sends a notification to users when their feedback is reviewed.', c3: 'Pending Review', c4: 'Apex Motorsports', c5: 'Sam Carter' },
  { id: 'r2', c1: 'Overview of User Suggestions', c2: 'When a user submits feedback, send a confirmation email...', c3: 'Under Review', c4: 'Velocity Racing', c5: 'Alex Thompson' },
  { id: 'r3', c1: 'Summary of User Insights', c2: 'Integrate with a feedback analysis tool to categorize user comments.', c3: 'Feedback Type', c4: 'Thunderbolt R', c5: 'Jordan Blake' },
];

const FIELD_TYPES: { label: string; type: ColumnType; icon: React.ComponentType<any>; group: 'Miro' | 'Custom' }[] = [
  // Miro fields
  { label: 'Tags', type: 'tags', icon: IconList, group: 'Miro' },
  { label: 'Blocking', type: 'blocking', icon: IconArrowRight, group: 'Miro' },
  { label: 'Blocked by', type: 'blockedBy', icon: IconArrowLeft, group: 'Miro' },
  { label: 'Parent', type: 'parent', icon: IconArrowUpRight, group: 'Miro' },
  { label: 'Child', type: 'child', icon: IconArrowUpRight, group: 'Miro' },
  // Custom fields
  { label: 'Text', type: 'text', icon: IconTextLinesThree, group: 'Custom' },
  { label: 'Number', type: 'number', icon: IconHash, group: 'Custom' },
  { label: 'Select', type: 'select', icon: IconSelect, group: 'Custom' },
  { label: 'Multiple select', type: 'multiSelect', icon: IconListChecks, group: 'Custom' },
  { label: 'Date', type: 'date', icon: IconCalendarBlank, group: 'Custom' },
  { label: 'Person', type: 'person', icon: IconUser, group: 'Custom' },
  { label: 'Link', type: 'link', icon: IconLink, group: 'Custom' },
  { label: 'Formula', type: 'formula', icon: IconSigma, group: 'Custom' },
  { label: 'Relates to', type: 'relatesTo', icon: IconArrowUpRight, group: 'Custom' },
];

// --- Components ---

function HeaderButton({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="size-[32px] bg-[var(--background)] rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors hover:bg-[var(--secondary)]"
    >
      <div className="size-4 flex items-center justify-center">{icon}</div>
    </div>
  );
}

function HeaderCell({ 
  column, 
  onResize 
}: { 
  column: Column; 
  onResize: (newWidth: number) => void 
}) {
  const Icon = getIconForType(column.type);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = column.width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <div
      className={cn(
        "h-[44px] bg-[var(--background)] flex items-center px-2 gap-2 overflow-hidden border-r border-transparent hover:border-[var(--border)] group relative",
        column.isPrimary ? "pl-[44px]" : "justify-center"
      )}
      style={{ width: column.width, minWidth: column.width }}
    >
      <div className="size-4 text-[var(--muted-foreground)] flex items-center justify-center shrink-0">
        <Icon />
      </div>
      <span className="text-[14px] font-semibold text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis font-[family-name:var(--font-noto)]">
        {column.label}
      </span>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize z-10 hover:bg-[var(--primary)] opacity-0 hover:opacity-100 transition-opacity nodrag",
          isResizing && "bg-[var(--primary)] opacity-100"
        )}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function getIconForType(type: ColumnType) {
  const field = FIELD_TYPES.find(f => f.type === type);
  return field ? field.icon : IconTextLinesThree;
}

// --- Cell Renderers ---

const CellContent = ({ 
  value, 
  type, 
  isEditing, 
  onChange, 
  onBlur 
}: { 
  value: any; 
  type: ColumnType; 
  isEditing: boolean; 
  onChange: (val: any) => void; 
  onBlur: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Editing Mode
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="w-full h-full bg-white px-1 outline-none border border-[var(--primary)] rounded-sm font-[family-name:var(--font-noto)] text-[14px]"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onBlur();
        }}
      />
    );
  }

  // View Mode
  if (!value) return <div className="h-4" />; // Placeholder for height

  switch (type) {
    case 'select':
    case 'multiSelect':
    case 'tags':
      return (
         <div className={cn("px-2 py-1 rounded-[4px] text-[14px] whitespace-nowrap font-[family-name:var(--font-noto)] bg-[var(--secondary)] text-[var(--foreground)] inline-block")}>
           {value}
         </div>
      );
    case 'link':
      return (
         <div className="bg-[var(--secondary)] rounded-full px-2 py-1 flex items-center gap-1 max-w-full inline-flex">
            <div className="size-4 rounded-full bg-blue-200 shrink-0" />
            <span className="text-[14px] truncate font-[family-name:var(--font-noto)] text-blue-600 underline decoration-blue-300">{value}</span>
         </div>
      );
    case 'person':
      return (
         <div className="bg-[var(--secondary)] rounded-full px-2 py-1 flex items-center gap-1 max-w-full inline-flex">
            <div className="size-4 rounded-full bg-gray-400 shrink-0" />
            <span className="text-[14px] truncate font-[family-name:var(--font-noto)]">{value}</span>
         </div>
      );
    case 'number':
      return <span className="text-[14px] text-[var(--foreground)] font-mono">{value}</span>;
    default:
      return <span className="text-[14px] text-[var(--foreground)] truncate font-[family-name:var(--font-noto)]">{value}</span>;
  }
};

export function TableFormat({ selected, data, id }: { selected?: boolean; data?: any; id?: string }) {
  const [columns, setColumns] = useState<Column[]>(data?.columns || DEFAULT_COLUMNS);
  const [rows, setRows] = useState<Row[]>(data?.rows || DEFAULT_ROWS);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const { setNodes } = useReactFlow();

  // Save table data to node
  const saveTableToNode = useCallback((newColumns: Column[], newRows: Row[]) => {
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                columns: newColumns,
                rows: newRows,
              },
            };
          }
          return node;
        })
      );
    }
  }, [id, setNodes]);

  // Debounced save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const scheduleSync = useCallback((newColumns: Column[], newRows: Row[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTableToNode(newColumns, newRows);
    }, 300);
  }, [saveTableToNode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync from external data (AI-generated content)
  useEffect(() => {
    if (data?.columns && data.columns.length > 0) {
      setColumns(data.columns);
    }
    if (data?.rows && data.rows.length > 0) {
      setRows(data.rows);
    }
  }, [data?.columns, data?.rows]);

  const handleAddRow = () => {
    const newRow: Row = {
      id: `r${Date.now()}`,
    };
    columns.forEach(col => newRow[col.id] = null);
    const newRows = [...rows, newRow];
    setRows(newRows);
    scheduleSync(columns, newRows);
  };

  const handleAddColumn = (type: ColumnType, label: string) => {
    const newColId = `c${Date.now()}`;
    const newCol: Column = {
      id: newColId,
      type,
      label,
      width: 150,
    };
    const newColumns = [...columns, newCol];
    setColumns(newColumns);
    scheduleSync(newColumns, rows);
  };

  const handleColumnResize = (colId: string, newWidth: number) => {
    const newColumns = columns.map(col => 
      col.id === colId ? { ...col, width: newWidth } : col
    );
    setColumns(newColumns);
    scheduleSync(newColumns, rows);
  };

  const handleCellUpdate = (rowId: string, colId: string, value: any) => {
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [colId]: value };
      }
      return row;
    });
    setRows(newRows);
    scheduleSync(columns, newRows);
  };

  const finishEditing = () => {
    setEditingCell(null);
  };

  return (
    <BaseFormatWidget 
      icon={<TableMenuIcon />} 
      title="Table" 
      selected={selected}
      id={id}
      flowEnabled={data?.flowEnabled}
      prompt={data?.prompt}
      promptTitle={data?.promptTitle}
      flowState={data?.flowState}
      autoSize={true}
      contentKey={rows.length + columns.length}
      className="w-auto h-auto inline-block"
    >
      <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--border)] inline-block select-none" style={{ padding: '8px' }}>
        {/* Toolbar */}
        <div className="flex gap-1 mb-2 px-1">
          <HeaderButton icon={<IconSync />} />
          <HeaderButton icon={<IconTable />} />
          <HeaderButton icon={<IconFunnel />} />
          <HeaderButton icon={<IconArrowsDownUp />} />
          <HeaderButton icon={<IconRectanglesTwoLinesFour />} />
          <HeaderButton icon={<IconEyeOpenSlash />} />
        </div>

        {/* Grid Container */}
        <div className="bg-[var(--border)] rounded-[var(--radius-md)] flex flex-col gap-[1px] p-[1px] overflow-hidden">
          
          {/* Header Row */}
          <div className="flex gap-[1px]">
            {columns.map(col => (
              <HeaderCell 
                key={col.id} 
                column={col} 
                onResize={(newWidth) => handleColumnResize(col.id, newWidth)} 
              />
            ))}
            {/* Add Column Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="w-[44px] bg-[var(--background)] flex items-center justify-center hover:bg-[var(--secondary)] cursor-pointer transition-colors">
                  <IconPlus className="size-4 text-[var(--muted-foreground)]" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel>Miro fields</DropdownMenuLabel>
                {FIELD_TYPES.filter(f => f.group === 'Miro').map(field => (
                  <DropdownMenuItem key={field.type} onClick={() => handleAddColumn(field.type, field.label)}>
                    <field.icon className="mr-2 size-4" />
                    {field.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Custom fields</DropdownMenuLabel>
                {FIELD_TYPES.filter(f => f.group === 'Custom').map(field => (
                  <DropdownMenuItem key={field.type} onClick={() => handleAddColumn(field.type, field.label)}>
                    <field.icon className="mr-2 size-4" />
                    {field.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rows */}
          {rows.map((row, index) => (
            <div key={row.id} className="flex gap-[1px]">
              {columns.map((col, colIndex) => {
                const isPrimary = col.isPrimary;
                return (
                  <div 
                    key={col.id}
                    className={cn(
                      "min-h-[44px] bg-[var(--background)] flex items-center px-2 py-1 overflow-hidden",
                      isPrimary ? "flex" : ""
                    )}
                    style={{ width: col.width, minWidth: col.width }}
                    onDoubleClick={() => setEditingCell({ rowId: row.id, colId: col.id })}
                  >
                    {isPrimary ? (
                      <>
                         {/* Row Number / Handle */}
                         <div className="w-[44px] flex items-center justify-center text-[var(--muted-foreground)] text-xs shrink-0 -ml-2 mr-2 border-r border-transparent self-stretch">
                            <span className="opacity-50 group-hover:opacity-100">{index + 1}</span>
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <CellContent 
                              value={row[col.id]} 
                              type={col.type} 
                              isEditing={editingCell?.rowId === row.id && editingCell?.colId === col.id}
                              onChange={(val) => handleCellUpdate(row.id, col.id, val)}
                              onBlur={finishEditing}
                            />
                         </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center">
                        <CellContent 
                           value={row[col.id]} 
                           type={col.type} 
                           isEditing={editingCell?.rowId === row.id && editingCell?.colId === col.id}
                           onChange={(val) => handleCellUpdate(row.id, col.id, val)}
                           onBlur={finishEditing}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Row End Spacer */}
              <div className="w-[44px] bg-[var(--background)]" />
            </div>
          ))}

          {/* Add Row Footer */}
          <div 
            onClick={handleAddRow}
            className="h-[44px] bg-[var(--background)] flex items-center px-[14px] cursor-pointer hover:bg-[var(--secondary)] transition-colors"
          >
             <IconPlus className="size-4 text-[var(--muted-foreground)]" />
             <span className="ml-2 text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-noto)]">Add row</span>
          </div>
        </div>
      </div>
    </BaseFormatWidget>
  );
}
