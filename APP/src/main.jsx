import { BrowserRouter } from "react-router-dom";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { LanguageSelectionProvider } from './context/LanguageSelectionContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <LanguageSelectionProvider>
        <App />
      </LanguageSelectionProvider>
    </AppProvider>
  </BrowserRouter>,
)
