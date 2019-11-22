<template>
<div class="mk-renote-form">
	<mk-note-preview class="preview" :note="note"/>
	<template>
		<mk-post-form ref="form" :renote="note" @posted="onChildFormPosted"/>
	</template>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('desktop/views/components/renote-form.vue'),

	props: {
		note: {
			type: Object,
			required: true
		}
	},

	data() {
		return {
			wait: false,
		};
	},

	methods: {
		onChildFormPosted() {
			this.$emit('posted');
		}
	}
});
</script>

<style lang="stylus" scoped>
.mk-renote-form
	> .preview
		margin 16px 22px


</style>
