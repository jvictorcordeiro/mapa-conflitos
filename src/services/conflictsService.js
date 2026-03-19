const API_DELAY_MS = 450;
const API_ENDPOINT = "/api/conflicts.json";

let datasetPromise;

function cloneConflict(conflict) {
  return {
    ...conflict,
    coordinates: [...conflict.coordinates],
  };
}

function cloneMetadata(metadata) {
  return { ...metadata };
}

function isCoordinatePair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number")
  );
}

function normalizeConflictRecord(conflict) {
  if (
    !conflict ||
    typeof conflict !== "object" ||
    typeof conflict.id !== "number" ||
    typeof conflict.nome !== "string" ||
    typeof conflict.municipio !== "string" ||
    typeof conflict.tipo !== "string" ||
    typeof conflict.status !== "string" ||
    typeof conflict.data !== "string" ||
    typeof conflict.descricao !== "string" ||
    !isCoordinatePair(conflict.coordinates)
  ) {
    throw new Error("Resposta inválida da API de conflitos.");
  }

  return {
    id: conflict.id,
    nome: conflict.nome,
    municipio: conflict.municipio,
    tipo: conflict.tipo,
    status: conflict.status,
    data: conflict.data,
    descricao: conflict.descricao,
    coordinates: [...conflict.coordinates],
  };
}

function normalizeMetadata(meta) {
  if (
    !meta ||
    typeof meta !== "object" ||
    typeof meta.source !== "string" ||
    typeof meta.territory !== "string" ||
    typeof meta.updatedAt !== "string" ||
    typeof meta.isDemo !== "boolean"
  ) {
    throw new Error("Metadados inválidos da API de conflitos.");
  }

  return {
    source: meta.source,
    territory: meta.territory,
    updatedAt: meta.updatedAt,
    isDemo: meta.isDemo,
  };
}

async function loadDataset() {
  if (!datasetPromise) {
    datasetPromise = fetch(API_ENDPOINT)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar conflitos (${response.status}).`);
        }

        const payload = await response.json();
        const conflicts = Array.isArray(payload?.conflicts)
          ? payload.conflicts.map(normalizeConflictRecord)
          : null;

        if (!conflicts) {
          throw new Error("A API local não retornou a lista de conflitos.");
        }

        return {
          meta: normalizeMetadata(payload.meta),
          conflicts,
        };
      })
      .catch((error) => {
        datasetPromise = undefined;
        throw error;
      });
  }

  return datasetPromise;
}

function applyFilters(conflicts, filters = {}) {
  const search = (filters.search ?? "").trim().toLowerCase();
  const selectedType = filters.selectedType ?? "Todos os tipos";
  const selectedStatus = filters.selectedStatus ?? "Todos os status";

  return conflicts.filter((conflict) => {
    const matchesSearch =
      search.length === 0 ||
      conflict.nome.toLowerCase().includes(search) ||
      conflict.municipio.toLowerCase().includes(search);
    const matchesType =
      selectedType === "Todos os tipos" || conflict.tipo === selectedType;
    const matchesStatus =
      selectedStatus === "Todos os status" || conflict.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });
}

function resolveWithDelay(factory) {
  return new Promise((resolve, reject) => {
    window.setTimeout(async () => {
      try {
        resolve(await factory());
      } catch (error) {
        reject(error);
      }
    }, API_DELAY_MS);
  });
}

export function getAllConflicts() {
  return resolveWithDelay(async () => {
    const { conflicts } = await loadDataset();
    return conflicts.map(cloneConflict);
  });
}

export function getConflictsFiltered(filters = {}) {
  return resolveWithDelay(async () => {
    const { conflicts } = await loadDataset();
    return applyFilters(conflicts, filters).map(cloneConflict);
  });
}

export function getConflictsMetadata() {
  return resolveWithDelay(async () => {
    const { meta } = await loadDataset();
    return cloneMetadata(meta);
  });
}
