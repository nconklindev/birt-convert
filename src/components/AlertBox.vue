<script setup lang="ts">
import { computed } from 'vue'

type AlertVariant = 'warning' | 'info' | 'neutral' | 'success' | 'error'

interface Props {
  variant?: AlertVariant
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
})

const variantClasses = computed(() => {
  const variants: Record<AlertVariant, { container: string; title: string; text: string }> = {
    warning: {
      container: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50',
      title: 'text-amber-800 dark:text-amber-200',
      text: 'text-amber-700 dark:text-amber-300',
    },
    info: {
      container: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50',
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-700 dark:text-blue-300',
    },
    neutral: {
      container: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50',
      title: 'text-slate-800 dark:text-slate-200',
      text: 'text-slate-600 dark:text-slate-400',
    },
    success: {
      container: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50',
      title: 'text-green-800 dark:text-green-200',
      text: 'text-green-700 dark:text-green-300',
    },
    error: {
      container: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
    },
  }
  return variants[props.variant]
})
</script>
<template>
  <div class="rounded border p-3" :class="variantClasses.container">
    <h4 v-if="title" class="font-medium text-sm mb-1" :class="variantClasses.title">
      {{ title }}
    </h4>
    <div class="text-sm" :class="variantClasses.text">
      <slot />
    </div>
  </div>
</template>
