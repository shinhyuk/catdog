import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useGame } from './state/store';
import Layout from './components/Layout';
import Onboarding from './features/onboarding/Onboarding';
import MapView from './features/map/MapView';
import ListScreen from './features/list/ListScreen';
import Raid from './features/raid/Raid';
import Skills from './features/skills/Skills';

function Gate() {
  const { state } = useGame();
  if (!state.faction) return <Onboarding />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapView />} />
        <Route path="list" element={<ListScreen />} />
        <Route path="raid" element={<Raid />} />
        <Route path="skills" element={<Skills />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
