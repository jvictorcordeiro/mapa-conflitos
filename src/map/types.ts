export type ConflictStatus = "Ativo" | "Em mediação" | "Resolvido";

export type ConflictStatusFilter = "Todos os status" | ConflictStatus;

export type Conflict = {
  id: number;
  nome: string;
  municipio: string;
  tipo: string;
  status: ConflictStatus;
  data: string;
  descricao: string;
  coordinates: [number, number];
};

export type ConflictDatasetMeta = {
  source: string;
  territory: string;
  updatedAt: string;
  isDemo: boolean;
};

export type ConflictStats = {
  total: number;
  ativos: number;
  municipios: number;
};

export type ConflictFilters = {
  search?: string;
  selectedType?: string;
  selectedStatus?: ConflictStatusFilter;
};
