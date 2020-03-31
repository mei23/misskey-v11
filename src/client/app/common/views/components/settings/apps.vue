<template>
<div class="root">
	<ui-info v-if="!fetching && apps.length == 0">{{ $t('no-apps') }}</ui-info>
	<div class="apps" v-if="apps.length != 0">
		<div class="app" v-for="app in apps" :key="app.id">
			<p><b>{{ app.name }}</b></p>
			<p>{{ app.description }}</p>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
export default Vue.extend({
	i18n: i18n('desktop/views/components/settings.apps.vue'),
	data() {
		return {
			fetching: true,
			apps: []
		};
	},
	mounted() {
		this.$root.api('i/apps').then((apps: object[]) => {
			this.apps = apps;
			this.fetching = false;
		});
	}
});
</script>

<style lang="stylus" scoped>
.root
	> .apps
		> div
			padding 16px 0 0 0
			border-bottom solid 1px #eee
</style>
