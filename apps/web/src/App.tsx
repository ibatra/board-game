import { Route, Routes } from 'react-router-dom';
import { Home } from './routes/Home';
import { GameSetup } from './routes/GameSetup';
import { LocalGame } from './routes/LocalGame';
import { OnlineEntry } from './routes/OnlineEntry';
import { Lobby } from './routes/Lobby';
import { OnlineGame } from './routes/OnlineGame';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play/:gameId" element={<GameSetup />} />
      <Route path="/play/:gameId/local" element={<LocalGame />} />
      <Route path="/online" element={<OnlineEntry />} />
      <Route path="/room/:code" element={<Lobby />} />
      <Route path="/room/:code/game" element={<OnlineGame />} />
    </Routes>
  );
}
