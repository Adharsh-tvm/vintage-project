import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Provider } from 'react-redux'
import store from './redux/store.js'
import './App.css'
import ErrorBoundary from './utils/errorBoundary.jsx'

console.log("App is mounting...");


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store} >
      <ErrorBoundary>
        <App/>
      </ErrorBoundary>
    </Provider>
  </StrictMode>,
)
