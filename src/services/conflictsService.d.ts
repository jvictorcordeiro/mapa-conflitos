import type {
  Conflict,
  ConflictDatasetMeta,
  ConflictFilters,
} from "../map/types";

export function getAllConflicts(): Promise<Conflict[]>;
export function getConflictsFiltered(filters?: ConflictFilters): Promise<Conflict[]>;
export function getConflictsMetadata(): Promise<ConflictDatasetMeta>;
