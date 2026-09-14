import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startLocationDetection } from './utils/locationDetection'

/* Start the IP location lookup before the first render, so the home search
   bar can appear with the visitor's city already filled. */
startLocationDetection()

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
