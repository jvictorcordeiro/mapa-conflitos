import { useEffect, useRef } from "react";
import { formatDate } from "../services/conflictService";
import type {
  Conflict,
  ConflictDatasetMeta,
  ConflictStats,
  ConflictStatusFilter,
} from "../map/types";
import ConflictCard from "./ConflictCard";

type SidebarProps = {
  search: string;
  selectedType: string;
  selectedStatus: ConflictStatusFilter;
  typeOptions: string[];
  statusOptions: ConflictStatusFilter[];
  datasetMeta: ConflictDatasetMeta | null;
  stats: ConflictStats;
  conflicts: Conflict[];
  isLoading: boolean;
  loadError: string | null;
  selectedConflictId: number | null;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: ConflictStatusFilter) => void;
  onConflictSelect: (conflict: Conflict) => void;
};

export default function Sidebar({
  search,
  selectedType,
  selectedStatus,
  typeOptions,
  statusOptions,
  datasetMeta,
  stats,
  conflicts,
  isLoading,
  loadError,
  selectedConflictId,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onConflictSelect,
}: SidebarProps) {
  const selectedCardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedCardRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedConflictId]);

  return (
    <aside className="sidebar-shell w-[352px] shrink-0 flex flex-col">
      <div className="border-b border-white/8 px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10 text-sm font-bold text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.14)]">
            CA
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
              Territorial Monitor
            </p>
            <h1 className="mt-1 text-[19px] font-semibold leading-none text-slate-50">
              Conflitos Agrários
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                {datasetMeta?.isDemo ? "API local" : "Dados"}
              </span>
              <span>{datasetMeta?.territory ?? "Pernambuco"}</span>
              <span className="text-slate-600">/</span>
              <span>
                {datasetMeta ? `atualizado em ${formatDate(datasetMeta.updatedAt)}` : "carregando base"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-white/8 px-5 py-4 space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Busca rápida
          </label>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/8 bg-slate-950/75 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 focus:border-emerald-400/60 focus:bg-slate-950"
            placeholder="Município ou conflito"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
            className="rounded-2xl border border-white/8 bg-slate-950/75 px-4 py-3 text-sm text-slate-200 outline-none transition duration-200 focus:border-emerald-400/60"
          >
            {typeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(event) =>
              onStatusChange(event.target.value as ConflictStatusFilter)
            }
            className="rounded-2xl border border-white/8 bg-slate-950/75 px-4 py-3 text-sm text-slate-200 outline-none transition duration-200 focus:border-emerald-400/60"
          >
            {statusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="mt-2 text-xl font-semibold text-slate-50">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ativos</p>
            <p className="mt-2 text-xl font-semibold text-slate-50">{stats.ativos}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Municípios
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-50">{stats.municipios}</p>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll flex-1 overflow-auto px-4 py-4 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Ocorrências filtradas
          </h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
            {isLoading ? "Carregando" : `${conflicts.length} itens`}
          </span>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/8 px-4 py-3 text-sm text-red-100">
            Não foi possível carregar a base de conflitos. Detalhe: {loadError}
          </div>
        )}

        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            isSelected={selectedConflictId === conflict.id}
            cardRef={selectedConflictId === conflict.id ? selectedCardRef : undefined}
            onClick={() => onConflictSelect(conflict)}
          />
        ))}

        {isLoading && conflicts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
            Carregando conflitos...
          </div>
        )}

        {!isLoading && conflicts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
            Nenhum conflito encontrado com os filtros atuais.
          </div>
        )}
      </div>
    </aside>
  );
}
