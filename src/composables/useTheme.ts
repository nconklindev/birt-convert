import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark')
const isDark = ref(true)
let isInitialized = false

function setTheme(newTheme: Theme) {
  theme.value = newTheme
  isDark.value = newTheme === 'dark'

  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  localStorage.setItem('theme', newTheme)
}

function initTheme() {
  if (isInitialized) return

  const savedTheme = localStorage.getItem('theme') as Theme | null
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const initialTheme = savedTheme || systemTheme

  setTheme(initialTheme)
  isInitialized = true
}

// Initialize immediately when the module loads
if (typeof window !== 'undefined') {
  initTheme()
}

export function useTheme() {
  // Ensure initialization (in case module hasn't loaded yet)
  if (!isInitialized) {
    initTheme()
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme
  }
}
