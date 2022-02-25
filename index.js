import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'

import App from './modules/App'
import './config.webapp'

if (process.env.NODE_ENV !== 'production') {
  // window.ENABLE_LEANCLOUD_INTEGRATION = false
  window.USE_LC_OAUTH = false
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>,
  document.getElementById('app')
)
