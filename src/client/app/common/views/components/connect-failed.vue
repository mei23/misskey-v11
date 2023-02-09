<template>
<div class="mk-connect-failed">
	<h1>{{ $t('title') }}</h1>
	<p class="text">
		<span>{{ this.$t('description').substr(0, this.$t('description').indexOf('{')) }}</span>
		<a @click="reload">{{ this.$t('description').match(/\{(.+?)\}/)[1] }}</a>
		<span>{{ this.$t('description').substr(this.$t('description').indexOf('}') + 1) }}</span>
	</p>
	<p class="thanks">{{ $t('thanks') }}</p>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/components/connect-failed.vue'),
	components: {
	},
	data() {
		return {
		};
	},
	mounted() {
		document.title = 'Oops!';
		document.documentElement.style.setProperty('background', '#f8f8f8', 'important');
	},
	methods: {
		reload() {
			location.reload(true);
		}
	}
});
</script>

<style lang="stylus" scoped>


.mk-connect-failed
	width 100%
	padding 32px 18px
	text-align center

	> h1
		display block
		margin 1.25em auto 0.65em auto
		font-size 1.5em
		color #555

	> .text
		display block
		margin 0 auto
		max-width 600px
		font-size 1em
		color #666

	> .thanks
		display block
		margin 2em auto 0 auto
		padding 2em 0 0 0
		max-width 600px
		font-size 0.9em
		font-style oblique
		color #aaa
		border-top solid 1px #eee

	@media (max-width 500px)
		padding 24px 18px
		font-size 80%

</style>

