import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/main.css'

const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Component:', instance)
  console.error('Info:', info)
}

// Enable performance tracking in dev
if (import.meta.env.DEV) {
  app.config.performance = true
}

app.mount('#app')
