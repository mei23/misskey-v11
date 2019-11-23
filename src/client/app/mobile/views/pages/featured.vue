<template>
<mk-ui>
	<template #header><span style="margin-right:4px;"><fa :icon="faNewspaper"/></span>{{ $t('@.featured-notes') }}</template>

	<main>
		<details>
			<summary>{{ $t('options') }}</summary>
			<ui-select v-model="days">
				<template #label>{{ $t('days') }}</template>
				<option value="0.125">3 {{ $t('hour') }}</option>
				<option value="0.25">6 {{ $t('hour') }}</option>
				<option value="0.5">12 {{ $t('hour') }}</option>
				<option value="1">1 {{ $t('day') }}</option>
				<option value="2">2 {{ $t('day') }}</option>
				<option value="7">7 {{ $t('day') }}</option>
				<option value="30">30 {{ $t('day') }}</option>
			</ui-select>
			<div>
				<ui-switch v-model="includeGlobal">{{ $t('include-global') }}</ui-switch>
				<ui-switch v-model="mediaOnly">{{ $t('media-only') }}</ui-switch>
				<ui-switch v-model="nsfwOnly">{{ $t('nsfw-only') }}</ui-switch>
			</div>
		</details>
		<sequential-entrance animation="entranceFromTop" delay="25">
			<template v-for="note in notes">
				<mk-note class="post" :note="note" :key="note.id" :class="{ round: $store.state.device.roundedCorners }"/>
			</template>
		</sequential-entrance>
	</main>
</mk-ui>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('mobile/views/pages/featured.vue'),
	data() {
		return {
			includeGlobal: false,
			mediaOnly: false,
			nsfwOnly: false,
			days: 2,
			fetching: true,
			notes: [],
			faNewspaper
		};
	},
	watch: {
		includeGlobal() {
			this.fetch();
		},
		mediaOnly() {
			this.fetch();
		},
		nsfwOnly() {
			this.fetch();
		},
		days() {
			this.fetch();
		},
	},
	created() {
		this.fetch();
	},
	mounted() {
		document.title = this.$root.instanceName;
	},
	methods: {
		fetch() {
			Progress.start();
			this.fetching = true;

			this.$root.api('notes/featured', {
				limit: 30,
				days: Number(this.days),
				includeGlobal: this.includeGlobal,
				fileType: this.mediaOnly ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'] : undefined,
				excludeSfw: this.nsfwOnly,
			}).then((notes: any) => {
				notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				this.notes = notes;
				this.fetching = false;

				Progress.done();
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
main
	> details
		margin 16px 8px
		color var(--text)
		cursor pointer

	> * > .post
		margin-bottom 8px
		background var(--face)
		border-bottom 0

		&.round
			border-radius 6px

	@media (min-width 500px)
		> * > .post
			margin-bottom 16px

</style>
