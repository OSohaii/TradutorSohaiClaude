import { create } from 'zustand';

export type RightPanelTab = 'editor' | 'layers' | 'history';

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

  // Actions
  toggleLeftSidebar: () => void;
  togglePagesPanel: () => void;
  toggleRightPanel: () => void;
  setActiveRightTab: (tab: RightPanelTab) => void;
  setSelectedLayerId: (id: string | null) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setPagesPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  leftSidebarOpen: true,
  pagesPanelOpen: true,
  rightPanelOpen: true,
  activeRightTab: 'editor',
  selectedLayerId: null,

  toggleLeftSidebar: () => set(s => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  togglePagesPanel: () => set(s => ({ pagesPanelOpen: !s.pagesPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  setPagesPanelOpen: (open) => set({ pagesPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
}));
