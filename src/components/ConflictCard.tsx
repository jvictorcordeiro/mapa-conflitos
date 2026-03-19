import type { Conflict } from "../map/types";
import { formatDate, getStatusColor } from "../services/conflictService";

type ConflictCardProps = {
  conflict: Conflict;
  isSelected: boolean;
  cardRef?: React.Ref<HTMLButtonElement>;
  onClick: () => void;
};

export default function ConflictCard({
  conflict,
  isSelected,
  cardRef,
  onClick,
}: ConflictCardProps) {
  const statusColor = getStatusColor(conflict.status);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className={`map-card-hover w-full rounded-[22px] border px-4 py-3 text-left transition duration-200 ${
        isSelected
          ? "border-emerald-400/40 bg-slate-800/90 shadow-[0_14px_40px_rgba(16,185,129,0.12)]"
          : "border-white/8 bg-slate-900/60 hover:border-white/14 hover:bg-slate-900/88"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {conflict.municipio}
            </p>
          </div>
          <h3 className="mt-2 text-sm font-medium leading-snug text-slate-100">
            {conflict.nome}
          </h3>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[11px]"
          style={{
            color: statusColor,
            borderColor: `${statusColor}44`,
            backgroundColor: `${statusColor}18`,
          }}
        >
          {conflict.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="rounded-full border border-white/8 bg-slate-950/55 px-2.5 py-1">
          {conflict.tipo}
        </span>
        <span>{formatDate(conflict.data)}</span>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-slate-300/90">
        {conflict.descricao}
      </p>
    </button>
  );
}
