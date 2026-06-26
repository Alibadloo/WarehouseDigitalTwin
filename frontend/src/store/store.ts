import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { ShelfData, ShelfDetail, WarehouseStats, AIAnalysis, MoveSuggestions } from '../types';
import axios from 'axios';

// ── Settings (persisted to localStorage) ─────────────────────────────────────

export interface AppSettings {
  backendUrl: string;
  aiUrl: string;
  refreshInterval: number; // seconds, 0 = off
}

const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: 'http://localhost:5052',
  aiUrl: 'http://localhost:8002',
  refreshInterval: 30,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('wdt-settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem('wdt-settings', JSON.stringify(s));
}

// ── Async thunks ──────────────────────────────────────────────────────────────

const api = () => axios.create({ baseURL: loadSettings().backendUrl });
const aiApi = () => axios.create({ baseURL: loadSettings().aiUrl });

// Shelf & stats
export const fetchShelves = createAsyncThunk('wh/fetchShelves', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get<ShelfData[]>(`${settings.backendUrl}/api/shelves`);
  return r.data;
});

export const fetchStats = createAsyncThunk('wh/fetchStats', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get<WarehouseStats>(`${settings.backendUrl}/api/shelves/stats`);
  return r.data;
});

export const fetchShelfDetail = createAsyncThunk('wh/fetchShelfDetail', async (id: number, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get<ShelfDetail>(`${settings.backendUrl}/api/shelves/${id}`);
  return r.data;
});

// Item CRUD
export const addItem = createAsyncThunk('wh/addItem',
  async (req: { name: string; sku: string; category: string; quantity: number; weight: number; shelfId: number }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    const r = await axios.post(`${settings.backendUrl}/api/items`, req);
    return r.data;
  });

export const updateItem = createAsyncThunk('wh/updateItem',
  async (req: { id: number; name?: string; sku?: string; category?: string; quantity?: number; weight?: number }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    const { id, ...body } = req;
    const r = await axios.put(`${settings.backendUrl}/api/items/${id}`, body);
    return r.data;
  });

export const deleteItem = createAsyncThunk('wh/deleteItem',
  async (id: number, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    await axios.delete(`${settings.backendUrl}/api/items/${id}`);
    return id;
  });

export const moveItem = createAsyncThunk('wh/moveItem',
  async ({ itemId, toShelfId, reason }: { itemId: number; toShelfId: number; reason: string }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    await axios.post(`${settings.backendUrl}/api/items/${itemId}/move/${toShelfId}`, { quantity: 0, reason });
    return { itemId, toShelfId };
  });

export const fetchMovements = createAsyncThunk('wh/fetchMovements', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get<MovementLog[]>(`${settings.backendUrl}/api/items/movements`);
  return r.data;
});

// Admin
export const resetWarehouse = createAsyncThunk('wh/reset',
  async (mode: 'empty' | 'seed', { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    const r = await axios.post(`${settings.backendUrl}/api/admin/reset?mode=${mode}`);
    return r.data;
  });

export const exportWarehouse = createAsyncThunk('wh/export', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get(`${settings.backendUrl}/api/admin/export`, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `warehouse-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
});

export const addShelf = createAsyncThunk('wh/addShelf',
  async (req: { zone: string; row: number; column: number; maxCapacity: number; category: string }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    const r = await axios.post(`${settings.backendUrl}/api/admin/shelves`, req);
    return r.data;
  });

export const deleteShelf = createAsyncThunk('wh/deleteShelf',
  async (id: number, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    await axios.delete(`${settings.backendUrl}/api/admin/shelves/${id}`);
    return id;
  });

export const updateShelf = createAsyncThunk('wh/updateShelf',
  async ({ id, ...body }: { id: number; maxCapacity?: number; category?: string; notes?: string }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    await axios.put(`${settings.backendUrl}/api/admin/shelves/${id}`, body);
    return { id, ...body };
  });

// AI
export const runAIAnalysis = createAsyncThunk('wh/runAI', async (shelves: ShelfData[], { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.post<AIAnalysis>(`${settings.aiUrl}/analyze`, { shelves });
  return r.data;
});

export const fetchMoveSuggestions = createAsyncThunk('wh/moveSuggestions',
  async ({ shelfCode, items, allShelves }: { shelfCode: string; items: any[]; allShelves: ShelfData[] }, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    const r = await axios.post<MoveSuggestions>(`${settings.aiUrl}/suggest-move`, { shelfCode, items, allShelves });
    return r.data;
  });

export const fetchOllamaModels = createAsyncThunk('wh/ollamaModels', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const r = await axios.get<{ models: string[]; active: string }>(`${settings.aiUrl}/models`);
  return r.data;
});

export const updateAIModel = createAsyncThunk('wh/updateModel',
  async (model: string, { getState }) => {
    const { settings } = (getState() as RootState).warehouse;
    await axios.put(`${settings.aiUrl}/config`, { model });
    return model;
  });

export const checkConnections = createAsyncThunk('wh/checkConnections', async (_, { getState }) => {
  const { settings } = (getState() as RootState).warehouse;
  const results = { backend: false, ai: false };
  try {
    await axios.get(`${settings.backendUrl}/api/shelves/stats`, { timeout: 4000 });
    results.backend = true;
  } catch {}
  try {
    await axios.get(`${settings.aiUrl}/health`, { timeout: 4000 });
    results.ai = true;
  } catch {}
  return results;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MovementLog {
  id: number;
  item: string;
  from: string;
  to: string;
  quantity: number;
  reason: string;
  timestamp: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface State {
  shelves: ShelfData[];
  stats: WarehouseStats | null;
  selectedShelf: ShelfDetail | null;
  highlightedShelves: string[];
  analysis: AIAnalysis | null;
  moveSuggestions: MoveSuggestions | null;
  movements: MovementLog[];
  ollamaModels: string[];
  activeModel: string;
  settings: AppSettings;
  settingsOpen: boolean;
  connectionStatus: { backend: boolean; ai: boolean } | null;
  loading: boolean;
  aiLoading: boolean;
  resetting: boolean;
  error: string | null;
  filter: 'all' | 'empty' | 'full' | 'warning';
}

const initialState: State = {
  shelves: [],
  stats: null,
  selectedShelf: null,
  highlightedShelves: [],
  analysis: null,
  moveSuggestions: null,
  movements: [],
  ollamaModels: [],
  activeModel: '',
  settings: loadSettings(),
  settingsOpen: false,
  connectionStatus: null,
  loading: false,
  aiLoading: false,
  resetting: false,
  error: null,
  filter: 'all',
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const slice = createSlice({
  name: 'warehouse',
  initialState,
  reducers: {
    selectShelf: (s, a: PayloadAction<ShelfDetail | null>) => {
      s.selectedShelf = a.payload;
      s.moveSuggestions = null;
    },
    setFilter: (s, a: PayloadAction<State['filter']>) => { s.filter = a.payload; },
    highlightShelves: (s, a: PayloadAction<string[]>) => { s.highlightedShelves = a.payload; },
    clearHighlights: (s) => { s.highlightedShelves = []; },
    clearAnalysis: (s) => { s.analysis = null; },
    openSettings: (s) => { s.settingsOpen = true; },
    closeSettings: (s) => { s.settingsOpen = false; },
    updateSettings: (s, a: PayloadAction<Partial<AppSettings>>) => {
      s.settings = { ...s.settings, ...a.payload };
      saveSettings(s.settings);
    },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchShelves.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchShelves.fulfilled, (s, a) => { s.shelves = a.payload; s.loading = false; });
    b.addCase(fetchShelves.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Cannot reach backend'; });

    b.addCase(fetchStats.fulfilled, (s, a) => { s.stats = a.payload; });
    b.addCase(fetchShelfDetail.fulfilled, (s, a) => { s.selectedShelf = a.payload; });

    b.addCase(runAIAnalysis.pending, (s) => { s.aiLoading = true; });
    b.addCase(runAIAnalysis.fulfilled, (s, a) => { s.analysis = a.payload; s.aiLoading = false; });
    b.addCase(runAIAnalysis.rejected, (s) => { s.aiLoading = false; });

    b.addCase(fetchMoveSuggestions.fulfilled, (s, a) => { s.moveSuggestions = a.payload; });
    b.addCase(fetchMovements.fulfilled, (s, a) => { s.movements = a.payload; });

    b.addCase(fetchOllamaModels.fulfilled, (s, a) => {
      s.ollamaModels = a.payload.models;
      s.activeModel = a.payload.active;
    });
    b.addCase(updateAIModel.fulfilled, (s, a) => { s.activeModel = a.payload; });

    b.addCase(resetWarehouse.pending, (s) => { s.resetting = true; });
    b.addCase(resetWarehouse.fulfilled, (s) => {
      s.resetting = false;
      s.selectedShelf = null;
      s.analysis = null;
      s.moveSuggestions = null;
    });
    b.addCase(resetWarehouse.rejected, (s) => { s.resetting = false; });

    b.addCase(checkConnections.fulfilled, (s, a) => { s.connectionStatus = a.payload; });

    b.addCase(addShelf.fulfilled, (s) => { s.selectedShelf = null; });
    b.addCase(deleteShelf.fulfilled, (s, a) => {
      if (s.selectedShelf?.id === a.payload) s.selectedShelf = null;
    });
  },
});

export const {
  selectShelf, setFilter, highlightShelves, clearHighlights,
  clearAnalysis, openSettings, closeSettings, updateSettings, clearError,
} = slice.actions;

export const store = configureStore({ reducer: { warehouse: slice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(fn: (s: RootState) => T) => useSelector(fn);
