<script lang="ts">
	let {
		header,
		children
	}: {
		header: string;
		children?: any;
	} = $props();
</script>

<!-- PlayCard - Reusable base layout for playground widgets -->
<div
	class="shadow-soft w-full rounded-card bg-white transition-transform duration-200 hover:scale-105"
>
	<!-- Header slot with gradient strip -->
	<div
		class="flex items-center gap-2 rounded-t-card bg-gradient-to-r from-primary to-accent p-4 text-lg font-bold text-white"
	>
		{header}
	</div>

	<!-- Body slot with white background -->
	<div class="bg-white p-6">
		{@render children?.()}
	</div>

	<!-- Footer slot for optional actions -->
	<!-- Note: Footer can be added via children if needed -->
</div>
