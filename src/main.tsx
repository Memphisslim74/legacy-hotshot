import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './styles.css'
import './brand.css'
import './stage2.css'
import './settings.css'
import './stage3.css'
import './user-security.css'
import './professional.css'
import './relationships.css'
import './tracker.css'
import './legacy-operations.css'
import './admin-workspace.css'
import './sample-preview.css'
import './relationship-directory-v2.css'
import './account-administration.css'
import './driver-route-command.css'
import './operational-records.css'
import './field-operations.css'
import './layout-hotfix.css'
import './visual-second-pass.css'
import './core-workspace-polish.css'
import './relationship-load-workflow.css'
import './clickable-schedule-loads.css'
import './overview-gap-fix.css'
import './dashboard-column-containment.css'
import './public-quote.css'
import './driver-dispatch.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
