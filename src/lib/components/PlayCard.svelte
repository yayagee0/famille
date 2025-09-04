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
<div class="bg-white rounded-card shadow-soft transition-transform hover:scale-105 duration-200 w-full md:w-1/2 lg:w-1/3">
	<!-- Header slot with gradient strip -->
	<div class="from-primary to-accent bg-gradient-to-r text-white font-bold rounded-t-card p-2 text-lg flex items-center gap-2">
		{header}
	</div>
	
	<!-- Body slot with white background -->
	<div class="bg-white p-4">
		{@render children?.()}
	</div>
	
	<!-- Footer slot for optional actions -->
	<!-- Note: Footer can be added via children if needed -->
</div>