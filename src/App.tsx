import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CharacterProvider } from './context/CharacterContext';
import { GameStateProvider } from './context/GameStateContext';
import { Layout } from './components/Layout';
import { AvatarBuilderPage } from './pages/AvatarBuilderPage';
import { PlaysheetPage } from './pages/PlaysheetPage';
import { ResolverPage } from './pages/ResolverPage';

function App() {
  return (
    <CharacterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><AvatarBuilderPage /></Layout>} />
          <Route path="/playsheet" element={
            <GameStateProvider>
              <Layout><PlaysheetPage /></Layout>
            </GameStateProvider>
          } />
          <Route path="/resolver" element={
            <GameStateProvider>
              <Layout><ResolverPage /></Layout>
            </GameStateProvider>
          } />
        </Routes>
      </BrowserRouter>
    </CharacterProvider>
  );
}

export default App;