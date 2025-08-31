<script lang="ts">
  import { birthdays } from './birthdays';
  import dayjs from 'dayjs';

  // State for the selected family member and target age
  let selectedMember = $state(birthdays[0]);
  let targetAge = $state(10);
  let showExactOffsets = $state(false);

  // Calculate how old everyone would be when the selected member reaches target age
  const futureAges = $derived(() => {
    const selectedBirthDate = dayjs(selectedMember.date);
    const selectedCurrentAge = dayjs().diff(selectedBirthDate, 'year');
    const yearsToAdd = targetAge - selectedCurrentAge;
    
    return birthdays
      .filter(member => member.email !== selectedMember.email)
      .map(member => {
        const memberBirthDate = dayjs(member.date);
        const memberCurrentAge = dayjs().diff(memberBirthDate, 'year');
        const memberFutureAge = memberCurrentAge + yearsToAdd;
        const ageDifference = selectedCurrentAge - memberCurrentAge;
        
        return {
          ...member,
          futureAge: memberFutureAge,
          ageDifference: Math.abs(ageDifference),
          isOlder: ageDifference < 0
        };
      });
  });

  function decreaseAge() {
    if (targetAge > 1) targetAge--;
  }

  function increaseAge() {
    if (targetAge < 70) targetAge++;
  }
</script>

<div class="rounded-xl shadow p-4 bg-white">
  <h2 class="text-lg font-bold mb-4 text-indigo-700">👶➡️👴 Age Playground</h2>
  
  <!-- Family member selection -->
  <div class="mb-4">
    <label for="family-member-select" class="block text-sm font-medium text-gray-700 mb-2">Pick a family member:</label>
    <select 
      id="family-member-select"
      bind:value={selectedMember}
      class="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
    >
      {#each birthdays as member}
        <option value={member}>{member.name}</option>
      {/each}
    </select>
  </div>

  <!-- Target age control -->
  <div class="mb-4">
    <label for="target-age-slider" class="block text-sm font-medium text-gray-700 mb-2">Target age:</label>
    
    <!-- Age control row with buttons and slider -->
    <div class="flex items-center space-x-3 mb-2">
      <button
        onclick={decreaseAge}
        class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold"
        disabled={targetAge <= 1}
      >
        −
      </button>
      
      <input
        id="target-age-slider"
        type="range"
        min="1"
        max="70"
        bind:value={targetAge}
        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      
      <button
        onclick={increaseAge}
        class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold"
        disabled={targetAge >= 70}
      >
        +
      </button>
    </div>
    
    <!-- Number input that syncs with slider -->
    <input
      type="number"
      min="1"
      max="70"
      bind:value={targetAge}
      class="w-20 rounded-lg border border-gray-300 p-2 text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
    />
  </div>

  <!-- Show exact offsets checkbox -->
  <div class="mb-4">
    <label class="flex items-center space-x-2">
      <input
        type="checkbox"
        bind:checked={showExactOffsets}
        class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span class="text-sm text-gray-700">Show exact offsets</span>
    </label>
  </div>

  <!-- Results -->
  <div class="bg-indigo-50 rounded-lg p-3">
    <p class="text-sm font-medium text-indigo-900 mb-2">
      If {selectedMember.name} is {targetAge} years old:
    </p>
    
    <div class="space-y-1">
      {#each futureAges as member}
        <p class="text-sm text-gray-700">
          <span class="font-medium">{member.name}</span> will be 
          <span class="font-bold text-indigo-600">{member.futureAge}</span>
          {#if showExactOffsets}
            <span class="text-xs text-gray-500">
              ({member.ageDifference} {member.ageDifference === 1 ? 'year' : 'years'} {member.isOlder ? 'older' : 'younger'})
            </span>
          {/if}
        </p>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Custom slider styling */
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #4f46e5;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #4f46e5;
    cursor: pointer;
    border: none;
  }
</style>