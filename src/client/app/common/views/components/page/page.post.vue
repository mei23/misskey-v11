<template>
<div class="ngbfujlo">
	<ui-textarea class="textarea" :value="text" readonly></ui-textarea>
	<ui-button v-if="$store.state.i != null" primary @click="post()" :disabled="posting || posted">{{ posted ? $t('posted-from-post-form') : $t('post-from-post-form') }}</ui-button>
	<footer v-if="$store.state.i != null" style="padding-top: 8px; display: flex">
		<button @click="setVisibility" class="visibility" ref="visibilityButton">
			<x-visibility-icon :v="visibility" :localOnly="localOnly" :copyOnce="copyOnce"/>
		</button>
		<button class="cw" title="Hide" @click="useCw = !useCw" :class="{ useCW: this.useCw }"><fa :icon="['far', 'eye-slash']"/></button>
		<ui-input v-if="useCw" ref="cw" v-model="cw" style="margin: 0"/>
	</footer>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import XVisibilityIcon from '../visibility-icon.vue';
import MkVisibilityChooser from '../visibility-chooser.vue';
import { parseVisibility } from '../../../scripts/parse-visibility';

export default Vue.extend({
	i18n: i18n('pages'),

	components: {
		MkVisibilityChooser,
		XVisibilityIcon,
	},

	props: {
		page: {
			required: false
		},
		value: {
			required: true
		},
		script: {
			required: true
		}
	},

	data() {
		return {
			text: this.script.interpolate(this.value.text),
			visibility: 'public',
			localOnly: false,
			copyOnce: false,
			useCw: !!this.page.sensitive,
			cw: this.page.title,
			posted: false,
			posting: false,
		};
	},

	created() {
		this.$watch('script.vars', () => {
			this.text = this.script.interpolate(this.value.text);
		}, { deep: true });
	},

	mounted() {
		this.applyVisibility(this.$store.state.settings.defaultNoteVisibility);
	},

	methods: {
		setVisibility() {
			const w = this.$root.new(MkVisibilityChooser, {
				source: this.$refs.visibilityButton,
				currentVisibility: this.visibility
			});
			w.$once('chosen', v => {
				this.applyVisibility(v);
			});
		},

		applyVisibility(v :string) {
			const vis = parseVisibility(v);
			this.localOnly = vis.localOnly;
			this.copyOnce = vis.copyOnce;
			this.visibility = vis.visibility;
		},

		post() {
			this.posting = true;
			this.$root.api('notes/create', {
				text: this.text,
				visibility: this.visibility,
				localOnly: this.localOnly,
				copyOnce: this.copyOnce,
				cw: this.useCw ? this.cw || '' : undefined,
			}).then(() => {
				this.posted = true;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.ngbfujlo
	padding 0 32px 32px 32px
	border solid 2px var(--pageBlockBorder)
	border-radius 6px

	@media (max-width 600px)
		padding 0 16px 16px 16px

		> .textarea
			margin-top 16px
			margin-bottom 16px

	> footer
		> button
			padding 8px

		> button.cw
			opacity 0.5
		
			&.useCW
				opacity 1

</style>
