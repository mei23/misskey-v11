<template>
<div class="glowckho">
	<details>
		<summary>{{ $t('options') }}</summary>
		<ui-select v-model="days" :disabled="fetching">
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
			<ui-switch v-model="includeGlobal" :disabled="fetching">{{ $t('include-global') }}</ui-switch>
			<ui-switch v-model="mediaOnly" :disabled="fetching">{{ $t('media-only') }}</ui-switch>
			<ui-switch v-model="sfwOnly" :disabled="fetching">{{ $t('sfw-only') }}</ui-switch>
			<ui-switch v-model="nsfwOnly" :disabled="fetching">{{ $t('nsfw-only') }}</ui-switch>
		</div>
	</details>
	<div v-if="!fetching">
		<template v-for="note in notes">
			<mk-note class="post" :note="note" :key="note.id" :class="{ round: $store.state.device.roundedCorners }"/>
		</template>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';

export default Vue.extend({
	i18n: i18n('desktop/views/home/featured.vue'),

	data() {
		return {
			includeGlobal: false,
			mediaOnly: false,
			sfwOnly: false,
			nsfwOnly: false,
			days: 2,
			fetching: true,
			notes: [],
		};
	},
	watch: {
		includeGlobal() {
			this.fetch();
		},
		mediaOnly() {
			this.fetch();
		},
		sfwOnly() {
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
				fileType: this.mediaOnly ? ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'] : undefined,
				excludeNsfw: this.sfwOnly,
				excludeSfw: this.nsfwOnly,
			}, false, true).then((notes: any[]) => {
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
.glowckho
	margin 0 auto

	> details
		margin 16px 8px
		color var(--text)
		cursor pointer

	> * > .post
		margin-bottom 16px
		background var(--face)
		border-bottom 0

		&.round
			border-radius 6px

	> .more
		margin 32px 16px 16px 16px
		text-align center

</style>
