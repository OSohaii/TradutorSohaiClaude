import { create } from 'zustand';

export type RightPanelTab = 'editor' | 'layers' | 'history';
export type StudioTool = 'select' | 'text' | 'move' | 'brush' | 'eraser' | 'eyedropper';

export interface StudioState {
  /** Whether the left sidebar (icon rail) is visible */
  leftSidebarOpen: boolean;
  /** Whether the pages panel (thumbnails) is visible */
  pagesPanelOpen: boolean;
  /** Whether the right panel is visible */
  rightPanelOpen: boolean;
  /** Active tab in the right panel */
  activeRightTab: RightPanelTab;
  /** Currently selected layer/bubble ID */
  selectedLayerId: string | null;
  /** Currently active tool */
  activeTool: StudioTool;
  /** Zoom level (1 = 100%) */
  zoom: number;
  /** Whether editing mode is active */
  isEditingMode: boolean;
  /** Whether paint mode is active */
  isPaintMode: boolean;
  /** Overlay opacity (0-100) for bubble overlay */
  overlayOpacity: number;

  // Actions
  toggleLeftSidebar: () => void;
  togglePagesPanel: () => void;
  toggleRightPanel: () => void;
  setActiveRightTab: (tab: RightPanelTab) => void;
  setSelectedLayerId: (id: string | null) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setPagesPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveTool: (tool: StudioTool) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setIsEditingMode: (editing: boolean) => void;
  setIsPaintMode: (painting: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  leftSidebarOpen: true,
  pagesPanelOpen: true,
  rightPanelOpen: true,
  activeRightTab: 'editor',
  selectedLayerId: null,
  activeTool: 'select',
  zoom: 1,
  isEditingMode: false,
  isPaintMode: false,
  overlayOpacity: 100,

  toggleLeftSidebar: () => set(s => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  togglePagesPanel: () => set(s => ({ pagesPanelOpen: !s.pagesPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  setPagesPanelOpen: (open) => set({ pagesPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set(s => ({ zoom: typeof zoom === 'function' ? zoom(s.zoom) : zoom })),
  setIsEditingMode: (editing) => set({ isEditingMode: editing }),
  setIsPaintMode: (painting) => set({ isPaintMode: painting }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
}));
