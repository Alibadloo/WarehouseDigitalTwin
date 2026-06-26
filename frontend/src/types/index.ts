export interface ShelfData {
  id: number;
  code: string;
  zone: string;
  row: number;
  column: number;
  maxCapacity: number;
  currentCount: number;
  occupancyPct: number;
  itemCount: number;
  category: string;
  lastUpdated: string;
}

export interface ShelfDetail extends ShelfData {
  notes: string;
  items: ItemData[];
}

export interface ItemData {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  weight: number;
  lastMoved: string;
}

export interface WarehouseStats {
  totalShelves: number;
  emptyShelves: number;
  fullShelves: number;
  totalItems: number;
  totalCapacity: number;
  avgOccupancyPct: number;
  zones: ZoneStat[];
}

export interface ZoneStat {
  zone: string;
  shelves: number;
  items: number;
  capacity: number;
  empty: number;
}

export interface AIRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  reason: string;
  shelves: string[];
}

export interface AIAnalysis {
  overall_health: 'GOOD' | 'WARNING' | 'CRITICAL';
  summary: string;
  recommendations: AIRecommendation[];
}

export interface MoveSuggestion {
  targetShelf: string;
  reason: string;
}

export interface MoveSuggestions {
  suggestions: MoveSuggestion[];
  priority?: string;
  reason?: string;
}
