<template>
	<div style="display: inline-flex; align-items: center;">
		<div class="wrap" v-if="visibility == 'public'" :title="$t('@.note-visibility.public')">
			<fa icon="globe"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'home'" :title="$t('@.note-visibility.home')">
			<fa icon="home"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'followers'" :title="$t('@.note-visibility.followers')">
			<fa icon="lock"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'specified'" :title="$t('@.note-visibility.specified')">
			<fa icon="envelope"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-public'" :title="$t('@.note-visibility.local-public')">
			<div><fa icon="globe"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-home'" :title="$t('@.note-visibility.local-home')">
			<div><fa icon="home"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-followers'" :title="$t('@.note-visibility.local-followers')">
			<div><fa icon="lock"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-if="visibility == 'once-public'" :title="$t('@.note-visibility.once-public')">
			<fa :icon="faHandHoldingHeart"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'once-home'" :title="$t('@.note-visibility.once-home')">
			<fa :icon="faHandHoldingHeart"/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n(),
	props: {
		v: {
			type: String,
			required: true
		},
		localOnly: {
			type: Boolean,
			required: false,
			default: false
		},
		copyOnce: {
			type: Boolean,
			required: false,
			default: false
		},
	},
	data() {
		return {
			faHandHoldingHeart
		}
	},
	computed: {
		visibility(): string {
			return this.localOnly ? `local-${this.v}` : this.copyOnce ? `once-${this.v}` : this.v;
		},
	},
});
</script>

<style lang="stylus" scoped>
	.wrap
		> .localOnly
				color var(--primary)
				position absolute
				top -0.5em
				right -0.5em
				transform scale(0.8)
</style>
