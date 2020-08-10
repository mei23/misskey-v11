<template>
	<span class="mk-avatar" :style="style" :class="{ cat }" :title="user | acct" v-if="disableLink" v-user-preview="disablePreview ? undefined : user.id" @click="onClick" v-once>
		<img class="inner" :style="style" :src="url"/>
	</span>
	<router-link class="mk-avatar" :style="style" :class="{ cat }" :to="user | userPage" :title="user | acct" :target="target" v-else v-user-preview="disablePreview ? undefined : user.id">
		<img class="inner" :style="style" :src="url"/>
	</router-link>
</template>

<script lang="ts">
import Vue from 'vue';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';

export default Vue.extend({
	props: {
		user: {
			type: Object,
			required: true
		},
		target: {
			required: false,
			default: null
		},
		disableLink: {
			required: false,
			default: false
		},
		disablePreview: {
			required: false,
			default: false
		}
	},
	computed: {
		lightmode(): boolean {
			return this.$store.state.device.lightmode;
		},
		cat(): boolean {
			return this.user.isCat && this.$store.state.settings.circleIcons;
		},
		style(): any {
			return {
				borderRadius: this.$store.state.settings.circleIcons ? '100%' : null
			};
		},
		url(): string {
			return this.$store.state.device.disableShowingAnimatedImages
				? getStaticImageUrl(this.user.avatarUrl)
				: this.user.avatarUrl;
		}
	},
	watch: {
		'user.avatarBlurhash'() {
			this.$el.style.color = this.getBlurhashAvgColor(this.user.avatarBlurhash);
		}
	},
	mounted() {
		this.$el.style.color = this.getBlurhashAvgColor(this.user.avatarBlurhash);
	},
	methods: {
		getBlurhashAvgColor(s) {
			return typeof s == 'string'
				? '#' + [...s.slice(2, 6)]
						.map(x => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'.indexOf(x))
						.reduce((a, c) => a * 83 + c, 0)
						.toString(16)
						.padStart(6, '0')
				: undefined;
		},
		onClick(e) {
			this.$emit('click', e);
		}
	}
});
</script>

<style lang="stylus" scoped>
.mk-avatar
	display inline-block
	vertical-align bottom
	flex-shrink 0

	&:not(.cat)
		overflow hidden
		border-radius 8px

	&.cat::before,
	&.cat::after
		background #df548f
		border solid 4px currentColor
		box-sizing border-box
		content ''
		display inline-block
		height 50%
		width 50%

	&.cat::before
		border-radius 0 75% 75%
		transform rotate(37.5deg) skew(30deg)

	&.cat::after
		border-radius 75% 0 75% 75%
		transform rotate(-37.5deg) skew(-30deg)

	.inner
		bottom 0
		left 0
		position absolute
		right 0
		top 0
		transition border-radius 1s ease
		z-index 1
		overflow hidden
		object-fit cover
		width 100%
		height 100%
</style>
