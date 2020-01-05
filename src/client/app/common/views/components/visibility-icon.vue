<template>
	<div style="display: inline-flex; align-items: center;">
		<div class="wrap" v-if="visibility == 'public'">
			<fa icon="globe"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'home'">
			<fa icon="home"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'followers'">
			<fa icon="lock"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'specified'">
			<fa icon="envelope"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-public'">
			<div><fa icon="globe"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-home'">
			<div><fa icon="home"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-else-if="visibility == 'local-followers'">
			<div><fa icon="lock"/></div>
			<div class="localOnly"><fa icon="heart"/></div>
		</div>
		<div class="wrap" v-if="visibility == 'once-public'">
			<fa :icon="faTintSlash"/>
		</div>
		<div class="wrap" v-else-if="visibility == 'once-home'">
			<fa :icon="faTintSlash"/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { faTintSlash } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
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
			faTintSlash
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
