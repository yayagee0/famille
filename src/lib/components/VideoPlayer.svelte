<script lang="ts">
	let {
		src,
		poster = undefined,
		className = ''
	}: {
		src: string;
		poster?: string;
		className?: string;
	} = $props();
</script>

<video 
	controls 
	class="max-h-96 w-full rounded-lg bg-black {className}"
	{poster}
>
	<source {src} type="video/mp4" />
	<track kind="captions" src="" />
	Your browser does not support the video tag.
</video>