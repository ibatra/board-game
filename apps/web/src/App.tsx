import { Route, Routes } from 'react-router-dom';
import { Home } from './routes/Home';
import { GameSetup } from './routes/GameSetup';
import { LocalGame } from './routes/LocalGame';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play/:gameId" element={<GameSetup />} />
      <Route path="/play/:gameId/local" element={<LocalGame />} />
    </Routes>
  );
}
