<template>
<div class="mk-media-list">
	<template v-for="media in mediaList.filter(media => !previewable(media))">
		<x-banner :media="media" :key="media.id"/>
	</template>
	<div v-if="mediaList.filter(media => previewable(media)).length > 0" class="gird-container">
		<div :data-count="mediaList.filter(media => previewable(media)).length" ref="grid">
			<template v-for="(media, i) in mediaList">
				<mk-media-video :video="media" :key="media.id" v-if="media.type.startsWith('video')"/>
				<x-image :image="media" :key="media.id" v-else-if="media.type.startsWith('image')" :hide="hide" 
					@imageClick="showImage(i - [...mediaList].splice(0, i).filter(isVideo).length)"/>
			</template>
		</div>
	</div>
	<ImageBox v-if="imgList.length > 0" :images="imgList" :index="index" @close="index = null" :bgcolor="bgcolor" style="z-index: 99999"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import XBanner from './media-banner.vue';
import XImage from './media-image.vue';
import ImageBox from "vue-image-box";

export default Vue.extend({
	components: {
		XBanner,
		XImage,
		ImageBox
	},
	props: {
		mediaList: {
			required: true
		},
		hide: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	data() {
		return {
			index: null,
			bgcolor: "rgba(51, 51, 51, .9)",
		}
	},
	computed: {
		imgList(): any[] {
			return this.images
				.map(x => ({
					imageUrl: x.url,
					thumbUrl: x.thumbnailUrl,
					caption: x.nane,
				}));
		},
		images(): any[] {
			return (this.mediaList as { type: string }[]).filter(this.isImage);
		},
		count(): number {
			return (this.mediaList as { type: string }[]).filter(this.previewable).length;
		}
	},
	mounted() {
		//#region for Safari bug
		if (this.$refs.grid) {
			this.$refs.grid.style.height = this.$refs.grid.clientHeight ? `${this.$refs.grid.clientHeight}px`
				: (this.$store.state.device.inDeckMode ? '128px' : this.$root.isMobile ? '173px' : '287px');
		}
		//#endregion
	},
	methods: {
		showImage(i: number) {
			this.index = i;
		},
		isImage(file: { type: string }) {
			return file.type.startsWith('image');
		},
		isVideo(file: { type: string }) {
			return file.type.startsWith('video') || file.type.startsWith('audio');
		},
		previewable(file: { type: string }) {
			return this.isImage(file) || this.isVideo(file);
		},
	}
});
</script>

<style lang="stylus" scoped>
.mk-media-list
	> .gird-container
		width 100%
		margin-top 4px

		&:before
			content ''
			display block
			padding-top 56.25% // 16:9

		> div
			position absolute
			top 0
			right 0
			bottom 0
			left 0
			display grid
			grid-gap 4px

			> *
				overflow hidden
				border-radius 4px

			&[data-count="1"]
				grid-template-rows 1fr

			&[data-count="2"]
				grid-template-columns 1fr 1fr
				grid-template-rows 1fr

			&[data-count="3"]
				grid-template-columns 1fr 0.5fr
				grid-template-rows 1fr 1fr

				> *:nth-child(1)
					grid-row 1 / 3

				> *:nth-child(3)
					grid-column 2 / 3
					grid-row 2 / 3

			&[data-count="4"]
				grid-template-columns 1fr 1fr
				grid-template-rows 1fr 1fr

			> *:nth-child(1)
				grid-column 1 / 2
				grid-row 1 / 2

			> *:nth-child(2)
				grid-column 2 / 3
				grid-row 1 / 2

			> *:nth-child(3)
				grid-column 1 / 2
				grid-row 2 / 3

			> *:nth-child(4)
				grid-column 2 / 3
				grid-row 2 / 3

</style>
