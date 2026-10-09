import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/app.css'
import { registerServiceWorker } from './app/pwa'
import { startSession } from './app/startup'
import { initI18n } from './i18n'

initI18n()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void startSession()
registerServiceWorker()
