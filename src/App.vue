<script setup lang="ts">
import ThemeToggle from './components/ThemeToggle.vue'
import UploadForm from './components/UploadForm.vue'
</script>

<template>
  <div class="min-h-screen bg-background relative overflow-hidden">
    <!-- Skip to main content link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>

    <!-- Gradient Background -->
    <div class="gradient-bg" aria-hidden="true"></div>

    <!-- Noise Texture Overlay -->
    <div class="noise-overlay" aria-hidden="true"></div>

    <!-- Content -->
    <div class="relative z-10">
      <!-- Header -->
      <header class="border-b border-border backdrop-blur-sm bg-background/80">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-foreground">BIRT Convert</h1>
            <p class="text-sm text-muted-foreground">
              Convert decimal hours from BIRT Studio CSV and XLSX reports into hh:mm format.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content" class="container mx-auto px-4 py-8" aria-label="File conversion tool">
        <UploadForm />
      </main>
    </div>
  </div>
</template>

<style scoped>
.gradient-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image: url('@/assets/waves-bg.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.7;
  filter: saturate(0.6) brightness(1.2);
}

.noise-overlay {
  display: none;
}

.dark .gradient-bg {
  opacity: 0.7;
  mix-blend-mode: soft-light;
  filter: brightness(1.2) saturate(0.6);
}
</style>
