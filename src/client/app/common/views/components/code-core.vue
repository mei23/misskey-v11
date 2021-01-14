<template>
<code class="inline" v-if="inline">{{ code }}</code>
<highlightjs v-else :language="lang" :code="code"/>
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
code
	color #f8f8f8
	background #272822

	&.inline
		display inline

	&.hljs
		display block
		overflow-x auto
		padding .5em
</style>
