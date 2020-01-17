<template>
<div class="dkjvrdxtkvqrwmhfickhndpmnncsgacq" v-hotkey.global="keymap">
	<div class="bg" @click="close"></div>
	<img ref="img" :src="img.url" :alt="img.name" :title="img.name" @click="close" @load="loaded"/>
	<button v-if="isMultiple && !isFirst" class="prev" @click="prev">
		<fa :icon="faChevronLeft"/>
	</button>
	<button v-if="isMultiple" class="next" @click="next">
		<fa :icon="isLast ? faAngleDoubleLeft : faChevronRight"/>
	</button>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import anime from 'animejs';
import { faChevronLeft, faChevronRight, faAngleDoubleLeft } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	props: {
		image: {
			type: Object,
			required: false
		},
		images: {
			type: Array,
			required: false
		},
		index: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data() {
		return {
			currentIndex: 0,
			faChevronLeft, faChevronRight, faAngleDoubleLeft
		}
	},
	created() {
		if (this.image) {
			this.images = [this.image];
			this.currentIndex = 0;
		} else {
			this.currentIndex = this.index;
		}
	},
	mounted() {
		anime({
			targets: this.$el,
			opacity: 1,
			duration: 100,
			easing: 'linear'
		});
	},
	computed: {
		img(): any {
			return this.images[this.currentIndex];
		},
		isMultiple() {
			return this.images.length > 1;
		},
		isFirst() {
			return this.currentIndex === 0;
		},
		isLast() {
			return this.currentIndex === this.images.length - 1;
		},
		keymap(): any {
			return {
				'esc': this.close,
				'left': this.prev,
				'right': this.next,
			};
		}
	},
	methods: {
		loaded() {
			(this.$refs.img as HTMLImageElement).style.opacity = '1';
		},
		prev() {
			anime({
				targets: this.$refs.img,
				opacity: 0.5,
				duration: 100,
				easing: 'linear',
			}).finished.then(() => {
				if (this.isFirst) {
					this.currentIndex = this.images.length - 1;
				} else {
					this.currentIndex--;
				}
			});
		},
		next() {
			anime({
				targets: this.$refs.img,
				opacity: 0.5,
				duration: 100,
				easing: 'linear',
			}).finished.then(() => {
				if (this.isLast) {
					this.currentIndex = 0;
				} else {
					this.currentIndex++;
				}
			});
		},
		close() {
			anime({
				targets: this.$el,
				opacity: 0,
				duration: 100,
				easing: 'linear',
				complete: () => this.destroyDom()
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.dkjvrdxtkvqrwmhfickhndpmnncsgacq
	display block
	position fixed
	z-index 2048
	top 0
	left 0
	width 100%
	height 100%
	opacity 0

	> .bg
		display block
		position fixed
		z-index 1
		top 0
		left 0
		width 100%
		height 100%
		background rgba(#000, 0.7)

	> img
		position fixed
		z-index 2
		top 0
		right 0
		bottom 0
		left 0
		max-width 90%
		max-height 90%
		margin auto
		cursor zoom-out
		image-orientation from-image

	> button
		position fixed
		top 50%
		z-index 4096
		display flex
		align-items center
		justify-content center
		color #fff
		opacity 0.6
		margin-top -25px

		> svg
			height 50px
			width 50px

		&.prev
			left 0
			margin-left -10px

		&.next
			right 0
			margin-top -25px
			margin-right -10px

</style>
