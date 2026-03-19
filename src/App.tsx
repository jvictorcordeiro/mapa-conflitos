import { useState } from "react";
import MapPage from "./pages/MapPage";
import type { Conflict } from "./map/types";

export default function App() {
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);

  return (
    <MapPage
      selectedConflict={selectedConflict}
      onSelectConflict={setSelectedConflict}
    />
  );
}
