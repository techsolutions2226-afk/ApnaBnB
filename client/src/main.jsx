import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* The app scrolls to top itself on navigation (ScrollToTop) — stop the browser
   from restoring an old scroll position on back/forward, which would land
   every page mid-screen after the fact. */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
