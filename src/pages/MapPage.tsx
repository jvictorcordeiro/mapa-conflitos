import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import type {
  Conflict,
  ConflictDatasetMeta,
  ConflictFilters,
  ConflictStatusFilter,
} from "../map/types";
import { getConflictStats } from "../services/conflictService";
import {
  getAllConflicts,
  getConflictsFiltered,
  getConflictsMetadata,
} from "../services/conflictsService.js";

const MapView = lazy(() => import("../components/MapView"));

const statusOptions: ConflictStatusFilter[] = [
  "Todos os status",
  "Ativo",
  "Em mediação",
  "Resolvido",
];

type MapPageProps = {
  selectedConflict: Conflict | null;
  onSelectConflict: (conflict: Conflict | null) => void;
};

export default function MapPage({
  selectedConflict,
  onSelectConflict,
}: MapPageProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("Todos os tipos");
  const [selectedStatus, setSelectedStatus] =
    useState<ConflictStatusFilter>("Todos os status");
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([]);
  const [filteredConflicts, setFilteredConflicts] = useState<Conflict[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<ConflictDatasetMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    Promise.all([getAllConflicts(), getConflictsMetadata()])
      .then(([conflicts, metadata]) => {
        if (!isActive) {
          return;
        }

        setAllConflicts(conflicts);
        setDatasetMeta(metadata);
        setLoadError(null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Falha ao carregar dados.");
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const filters: ConflictFilters = {
      search,
      selectedType,
      selectedStatus,
    };

    getConflictsFiltered(filters)
      .then((conflicts) => {
        if (!isActive) {
          return;
        }

        setFilteredConflicts(conflicts);
        setLoadError(null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setFilteredConflicts([]);
        setLoadError(error instanceof Error ? error.message : "Falha ao filtrar dados.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [search, selectedStatus, selectedType]);

  useEffect(() => {
    if (
      selectedConflict &&
      !filteredConflicts.some((conflict) => conflict.id === selectedConflict.id)
    ) {
      onSelectConflict(null);
    }
  }, [filteredConflicts, onSelectConflict, selectedConflict]);

  const stats = useMemo(() => {
    return getConflictStats(filteredConflicts);
  }, [filteredConflicts]);

  const typeOptions = useMemo(() => {
    return [
      "Todos os tipos",
      ...Array.from(new Set(allConflicts.map((conflict) => conflict.tipo))),
    ];
  }, [allConflicts]);
  const selectedConflictId = selectedConflict?.id ?? null;

  const handleSearchChange = (value: string) => {
    setIsLoading(true);
    setSearch(value);
  };

  const handleTypeChange = (value: string) => {
    setIsLoading(true);
    setSelectedType(value);
  };

  const handleStatusChange = (value: ConflictStatusFilter) => {
    setIsLoading(true);
    setSelectedStatus(value);
  };

  const syncedSelectedConflict = useMemo(() => {
    if (!selectedConflict) {
      return null;
    }

    return (
      filteredConflicts.find((conflict) => conflict.id === selectedConflict.id) ??
      selectedConflict
    );
  }, [filteredConflicts, selectedConflict]);

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex">
      <Sidebar
        search={search}
        selectedType={selectedType}
        selectedStatus={selectedStatus}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datasetMeta={datasetMeta}
        stats={stats}
        conflicts={filteredConflicts}
        isLoading={isLoading}
        loadError={loadError}
        selectedConflictId={selectedConflictId}
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
        onStatusChange={handleStatusChange}
        onConflictSelect={onSelectConflict}
      />
      <Suspense
        fallback={
          <main className="relative h-full flex-1 overflow-hidden bg-slate-950">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="map-panel rounded-[24px] px-5 py-4 text-sm text-slate-300">
                Carregando motor do mapa...
              </div>
            </div>
          </main>
        }
      >
        <MapView
          conflicts={filteredConflicts}
          selectedConflict={syncedSelectedConflict}
          onSelectConflict={onSelectConflict}
        />
      </Suspense>
    </div>
  );
}
