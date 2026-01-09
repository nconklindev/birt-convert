<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

const isOpen = ref(false)
</script>

<template>
  <Collapsible v-model:open="isOpen" class="w-full bg-background max-w-3xl mx-auto mb-6">
    <CollapsibleTrigger as-child>
      <Button variant="ghost" class="w-full justify-between px-4 py-3 h-auto">
        <div class="flex items-center gap-2">
          <Icon
            icon="lucide:help-circle"
            class="w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
          <span class="font-medium">How to Use</span>
        </div>
        <Icon
          :icon="isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          class="w-4 h-4 text-muted-foreground transition-transform"
          aria-hidden="true"
        />
      </Button>
    </CollapsibleTrigger>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <CollapsibleContent v-show="isOpen" class="px-4 pb-4">
        <div class="rounded-lg border bg-card p-4 mt-2 space-y-6">
          <!-- Quick Start -->
          <section>
            <h3 class="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Icon icon="lucide:rocket" class="w-4 h-4" aria-hidden="true" />
              Quick Start
            </h3>
            <ol class="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-1">
              <li>Upload one or more CSV or XLSX files containing decimal hour values</li>
              <li>Click "Next" to analyze the files</li>
              <li>Select which columns contain decimal hours to convert</li>
              <li>Choose whether to keep original values or replace them</li>
              <li>Click "Convert" to download the converted files</li>
            </ol>
          </section>

          <!-- Common Issues -->
          <section>
            <h3 class="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Icon
                icon="lucide:alert-triangle"
                class="w-4 h-4 text-amber-500"
                aria-hidden="true"
              />
              Common Issues
            </h3>
            <div class="space-y-3">
              <!-- BIRT Formula Issue -->
              <div
                class="rounded border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 p-3"
              >
                <h4 class="font-medium text-amber-800 dark:text-amber-200 text-sm mb-1">
                  XLSX files with "columns have no data" error
                </h4>
                <p class="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  BIRT reports often contain formulas without cached values. The browser cannot
                  evaluate Excel formulas.
                </p>
                <p class="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Fix: Open the file in Excel, press Ctrl+S to save, then re-upload.
                </p>
              </div>

              <!-- Report Header Detection -->
              <div
                class="rounded border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-3"
              >
                <h4 class="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
                  Report headers detected automatically
                </h4>
                <p class="text-sm text-blue-700 dark:text-blue-300">
                  Files with BIRT report headers (containing "Time Period", "Executed on", "Query")
                  are automatically detected. The tool will find your data columns after the header
                  section.
                </p>
              </div>

              <!-- Merged Columns -->
              <div
                class="rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 p-3"
              >
                <h4 class="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">
                  Merged columns in Excel
                </h4>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Merged columns in the header row are automatically skipped to prevent duplicate or
                  empty column names.
                </p>
              </div>
            </div>
          </section>

          <!-- Supported Formats -->
          <section>
            <h3 class="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Icon icon="lucide:file-type" class="w-4 h-4" aria-hidden="true" />
              Supported Formats
            </h3>
            <div class="flex gap-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-2">
                <Icon
                  icon="lucide:file-spreadsheet"
                  class="w-4 h-4 text-green-600"
                  aria-hidden="true"
                />
                <span>CSV files (.csv)</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon
                  icon="lucide:file-spreadsheet"
                  class="w-4 h-4 text-green-600"
                  aria-hidden="true"
                />
                <span>Excel files (.xlsx)</span>
              </div>
            </div>
          </section>

          <!-- Conversion Info -->
          <section>
            <h3 class="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Icon icon="lucide:info" class="w-4 h-4" aria-hidden="true" />
              Conversion Details
            </h3>
            <p class="text-sm text-muted-foreground">
              Decimal hours (e.g., <code class="bg-muted px-1 rounded">8.5</code>) are converted to
              hh:mm:ss format (e.g., <code class="bg-muted px-1 rounded">08:30:00</code>). Negative
              values are supported and will display with a minus sign.
            </p>
          </section>
        </div>
      </CollapsibleContent>
    </Transition>
  </Collapsible>
</template>
