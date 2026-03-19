import type {
  Conflict,
  ConflictStats,
  ConflictStatus,
  ConflictStatusFilter,
} from "../map/types";

export function filterConflicts(
  conflicts: Conflict[],
  search: string,
  selectedType: string,
  selectedStatus: ConflictStatusFilter,
): Conflict[] {
  const normalizedSearch = search.trim().toLowerCase();

  return conflicts.filter((conflict) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      conflict.nome.toLowerCase().includes(normalizedSearch) ||
      conflict.municipio.toLowerCase().includes(normalizedSearch);
    const matchesType =
      selectedType === "Todos os tipos" || conflict.tipo === selectedType;
    const matchesStatus =
      selectedStatus === "Todos os status" || conflict.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });
}

export function getConflictStats(conflicts: Conflict[]): ConflictStats {
  return {
    total: conflicts.length,
    ativos: conflicts.filter((conflict) => conflict.status === "Ativo").length,
    municipios: new Set(conflicts.map((conflict) => conflict.municipio)).size,
  };
}

export function getStatusColor(status: ConflictStatus): string {
  if (status === "Ativo") return "#f87171";
  if (status === "Em mediação") return "#fbbf24";
  return "#34d399";
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}
