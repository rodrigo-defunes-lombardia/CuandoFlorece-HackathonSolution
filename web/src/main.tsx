import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import App from './App'
import { Limite, PantallaFallo } from './components/Limite'
createRoot(document.getElementById('root')!).render(
  <StrictMode><Limite fallback={error => <PantallaFallo error={error} />}><App /></Limite></StrictMode>,
)
