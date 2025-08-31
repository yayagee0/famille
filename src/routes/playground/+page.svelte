<script lang="ts">
  import AgePlaygroundCard from '$lib/AgePlaygroundCard.svelte';
  import DreamBuilderPlaygroundCard from '$lib/DreamBuilderPlaygroundCard.svelte';
  import BirthdayPreview from '$lib/BirthdayPreview.svelte';
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-900">🎮 Play Area</h1>
    <p class="mt-1 text-sm text-gray-500">Fun simulations and activities for everyone in the family</p>
  </div>

  <!-- Main playground widgets -->
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    <AgePlaygroundCard />
    <DreamBuilderPlaygroundCard />
  </div>

  <!-- Birthday preview -->
  <div class="max-w-md">
    <BirthdayPreview />
  </div>
</div>