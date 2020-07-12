<template>
<div class="uptimes">
	<p>Uptimes</p>
	<p>Process: {{ process }}</p>
	<p>OS: {{ os }}</p>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import formatUptime from '../../scripts/format-uptime';

export default Vue.extend({
	props: ['connection'],
	data() {
		return {
			process: 'Unknown',
			os: 'Unknown'
		};
	},
	mounted() {
		this.connection.on('stats', this.onStats);
	},
	beforeDestroy() {
		this.connection.off('stats', this.onStats);
	},
	methods: {
		onStats(stats: any) {
			this.process = stats.process_uptime > 0 ? formatUptime(stats.process_uptime) : 'Unknown';
			this.os = stats.process_uptime > 0 ? formatUptime(stats.os_uptime) : 'Unknown';
		}
	}
});
</script>

<style lang="stylus" scoped>
.uptimes
	padding 10px 14px

	> p
		margin 0
		font-size 12px
		color var(--text)

		&:first-child
			font-weight bold
</style>
