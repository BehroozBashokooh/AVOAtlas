import React from 'react'
import { createRoot } from 'react-dom/client'
import AVOAtlasV3 from './AVOAtlasV3.jsx'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AVOAtlasV3 />
  </React.StrictMode>
)
