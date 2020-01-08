<template>
<div class="gqyayizv">
	<div class="backdrop" ref="backdrop" @click="close"></div>
	<div class="popover" :class="{ isMobile: $root.isMobile }" ref="popover">
		<div @click="choose('public')" :class="{ active: v == 'public' }">
			<x-visibility-icon v="public"/>
			<div>
				<span>{{ $t('public') }}</span>
				<span>{{ $t('public-desc') }}</span>
			</div>
		</div>
		<div @click="choose('home')" :class="{ active: v == 'home' }">
			<x-visibility-icon v="home"/>
		<div>
				<span>{{ $t('home') }}</span>
				<span>{{ $t('home-desc') }}</span>
			</div>
		</div>
		<div @click="choose('followers')" :class="{ active: v == 'followers' }">
			<x-visibility-icon v="followers"/>
			<div>
				<span>{{ $t('followers') }}</span>
				<span>{{ $t('followers-desc') }}</span>
			</div>
		</div>
		<div @click="choose('specified')" :class="{ active: v == 'specified' }">
			<x-visibility-icon v="specified"/>
			<div>
				<span>{{ $t('specified') }}</span>
				<span>{{ $t('specified-desc') }}</span>
			</div>
		</div>
		<div @click="choose('once-public')" :class="{ active: v == 'once-public' }">
			<x-visibility-icon v="once-public"/>
			<div>
				<span>{{ $t('once-public') }}</span>
				<span>{{ $t('once-public-desc') }}</span>
			</div>
		</div>
		<div @click="choose('local-public')" :class="{ active: v == 'local-public' }">
			<x-visibility-icon v="local-public"/>
			<div>
				<span>{{ $t('local-public') }}</span>
				<span>{{ $t('local-public-desc') }}</span>
			</div>
		</div>
		<div @click="choose('local-home')" :class="{ active: v == 'local-home' }">
			<x-visibility-icon v="local-home"/>
			<div>
				<span>{{ $t('local-home') }}</span>
			</div>
		</div>
		<div @click="choose('local-followers')" :class="{ active: v == 'local-followers' }">
			<x-visibility-icon v="local-followers"/>
			<div>
				<span>{{ $t('local-followers') }}</span>
			</div>
		</div>
		<div @click="choose('once-specified')" :class="{ active: v == 'once-specified' }">
			<x-visibility-icon v="once-specified"/>
			<div>
				<span>{{ $t('once-specified') }}</span>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import anime from 'animejs';
import XVisibilityIcon from './visibility-icon.vue';

export default Vue.extend({
	i18n: i18n('common/views/components/visibility-chooser.vue'),
	components: {
		XVisibilityIcon,
	},
	props: {
		source: {
			required: true
		},
		currentVisibility: {
			type: String,
			required: false
		}
	},
	data() {
		return {
			v: this.$store.state.settings.rememberNoteVisibility ? (this.$store.state.device.visibility || this.$store.state.settings.defaultNoteVisibility) : (this.currentVisibility || this.$store.state.settings.defaultNoteVisibility)
		}
	},
	mounted() {
		this.$nextTick(() => {
			const popover = this.$refs.popover as HTMLElement;
			const sourceRect = (this.source as HTMLElement).getBoundingClientRect();

			// このポップアップのサイズ
			const popW = popover.offsetWidth;
			const popH = popover.offsetHeight;

			// 呼び出し元 (たいていボタン) の中心地点
			const sourceX = sourceRect.left + (this.source.offsetWidth / 2);
			const sourceY = sourceRect.top + (this.source.offsetHeight / 2);

			// このポップアップは呼び出し元の中心に配置
			let popX = sourceX - (popover.offsetWidth / 2);
			let popY = sourceY - (popover.offsetHeight / 2);

			// 右はみ出し判定
			if (popX + popW > window.innerWidth) popX = window.innerWidth - popW;
			// 下はみ出し判定
			if (popY + popH > window.innerHeight) popY = window.innerHeight - popH;
			// 左はみ出し判定
			if (popX < 0) popX = 0;
			// 上はみ出し判定
			if (popY < 0) popY = 0;

			popover.style.left = `${popX + window.pageXOffset}px`;
			popover.style.top = `${popY + window.pageYOffset}px`;

			anime({
				targets: this.$refs.backdrop,
				opacity: 1,
				duration: 100,
				easing: 'linear'
			});

			anime({
				targets: this.$refs.popover,
				opacity: 1,
				scale: [0.5, 1],
				duration: 500
			});
		});
	},
	methods: {
		choose(visibility) {
			if (this.$store.state.settings.rememberNoteVisibility) {
				this.$store.commit('device/setVisibility', visibility);
			}
			this.$emit('chosen', visibility);
			this.destroyDom();
		},
		close() {
			(this.$refs.backdrop as any).style.pointerEvents = 'none';
			anime({
				targets: this.$refs.backdrop,
				opacity: 0,
				duration: 200,
				easing: 'linear'
			});

			(this.$refs.popover as any).style.pointerEvents = 'none';
			anime({
				targets: this.$refs.popover,
				opacity: 0,
				scale: 0.5,
				duration: 200,
				easing: 'easeInBack',
				complete: () => this.destroyDom()
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.gqyayizv
	position initial

	> .backdrop
		position fixed
		top 0
		left 0
		z-index 10000
		width 100%
		height 100%
		background var(--modalBackdrop)
		opacity 0

	> .popover
		$bgcolor = var(--popupBg)
		position absolute
		z-index 10001
		width 240px
		padding 8px 0
		background $bgcolor
		border-radius 4px
		box-shadow 0 3px 12px rgba(27, 31, 35, 0.15)
		transform scale(0.5)
		opacity 0

		> div
			display flex
			padding 8px 14px
			font-size 12px
			color var(--popupFg)
			cursor pointer

			&:hover
				background var(--faceClearButtonHover)

			&:active
				background var(--faceClearButtonActive)

			&.active
				color var(--primaryForeground)
				background var(--primaryDarken5)

			> *
				user-select none
				pointer-events none

			> *:first-child
				display flex
				justify-content center
				align-items center
				margin-right 10px
				width 16px

			> *:last-child
				flex 1 1 auto

				> span:first-child
					display block
					font-weight bold

				> span:last-child:not(:first-child)
					opacity 0.6

</style>
