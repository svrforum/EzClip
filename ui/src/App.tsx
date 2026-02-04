import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import HomePage from './pages/HomePage'
import ImageEditorPage from './pages/ImageEditorPage'
import VideoEditorPage from './pages/VideoEditorPage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="image" element={<ImageEditorPage />} />
        <Route path="video" element={<VideoEditorPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
    </Routes>
  )
}

export default App
