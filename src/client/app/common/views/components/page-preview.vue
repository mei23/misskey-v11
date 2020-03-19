<template>
<router-link :to="`/@${page.user.username}/pages/${page.name}`" class="vhpxefrj" tabindex="-1">
	<div class="thumbnail" v-if="page.eyeCatchingImage" :style="`background-image: url('${page.eyeCatchingImage.thumbnailUrl}')`"></div>
	<article>
		<header>
			<h1 :title="page.title"><mfm :text="page.title" :key="page.title" :plain="true" :nowrap="true" :is-note="false" :i="$store.state.i" /></h1>
		</header>
		<p v-if="page.summary" :title="page.summary"><mfm :text="page.summary" :key="page.summary" :plain="true" :nowrap="true" :is-note="false" :i="$store.state.i" /></p>
		<footer>
			<img class="icon" :src="page.user.avatarUrl"/>
			<p>{{ page.user | userName }}</p>
		</footer>
	</article>
</router-link>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		page: {
			type: Object,
			required: true
		},
	},
});
</script>

<style lang="stylus" scoped>
.vhpxefrj
	display block
	overflow hidden
	width 100%
	border solid var(--lineWidth) var(--urlPreviewBorder)
	border-radius 4px
	overflow hidden

	&:hover
		text-decoration none
		border-color var(--urlPreviewBorderHover)

	> .thumbnail
		position absolute
		width 100px
		height 100%
		background-position center
		background-size cover
		display flex
		justify-content center
		align-items center

		> button
			font-size 3.5em
			opacity: 0.7

			&:hover
				font-size 4em
				opacity 0.9

		& + article
			left 100px
			width calc(100% - 100px)

	> article
		padding 16px

		> header
			margin-bottom 8px

			> h1
				margin 0
				font-size 1em
				color var(--urlPreviewTitle)
				overflow hidden
				text-overflow ellipsis

		> p
			margin 0
			color var(--urlPreviewText)
			font-size 0.8em
			overflow hidden
			text-overflow ellipsis

		> footer
			margin-top 8px
			height 16px

			> img
				display inline-block
				width 16px
				height 16px
				margin-right 4px
				vertical-align top

			> p
				display inline-block
				margin 0
				color var(--urlPreviewInfo)
				font-size 0.8em
				line-height 16px
				vertical-align top

	@media (max-width 700px)
		> .thumbnail
			position relative
			width 100%
			height 100px

			& + article
				left 0
				width 100%

</style>
