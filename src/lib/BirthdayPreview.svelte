<script lang="ts">
  import { getNextBirthday } from './birthdays';
  import dayjs from 'dayjs';

  // Get the next upcoming birthday
  const nextBirthday = getNextBirthday();
  const formattedDate = dayjs(nextBirthday.nextDate).format('MMMM D');
</script>

<div class="rounded-xl shadow p-4 bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200">
  <div class="text-center">
    <div class="text-2xl mb-2">🎂</div>
    <h3 class="text-sm font-semibold text-purple-700 mb-1">Next Birthday</h3>
    <p class="text-lg font-bold text-gray-900">{nextBirthday.name}</p>
    <p class="text-sm text-gray-600">{formattedDate}</p>
    <p class="text-xs text-purple-600 mt-1">
      {#if nextBirthday.daysUntil === 0}
        🎉 Today!
      {:else if nextBirthday.daysUntil === 1}
        🎈 Tomorrow!
      {:else}
        {nextBirthday.daysUntil} days to go
      {/if}
    </p>
  </div>
</div>