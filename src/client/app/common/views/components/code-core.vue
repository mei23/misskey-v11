<template>
<highlightjs :language="lang" :code="code" />
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		code: {
			type: String,
			required: true
		},
		lang: {
			type: String,
			required: false
		},
		inline: {
			type: Boolean,
			required: false
		}
	},
});
</script>
<style lang="stylus" scoped>
// fallback
code
	display block
	overflow-x auto
	padding .5em
	color #333
	background #f8f8f8
</style>
