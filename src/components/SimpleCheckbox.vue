<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  modelValue: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isChecked = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <input
      :id="id"
      v-model="isChecked"
      type="checkbox"
      :disabled="disabled"
      @change="handleChange"
      class="peer h-4 w-4 shrink-0 appearance-none rounded border border-input bg-background shadow-sm transition-all cursor-pointer
             checked:bg-primary checked:border-primary
             hover:border-primary/50
             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
             disabled:cursor-not-allowed disabled:opacity-50"
    />
    <!-- Checkmark SVG -->
    <svg
      class="absolute left-0 top-0 h-4 w-4 pointer-events-none text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"
        fill="currentColor"
      />
    </svg>
  </div>
</template>

<style scoped>
/* Remove default checkbox appearance on all browsers */
input[type='checkbox'] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
