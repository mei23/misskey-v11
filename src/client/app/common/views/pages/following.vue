<template>
<div>
	<div v-if="$store.getters.isSignedIn && $store.state.i.host == null && $store.state.i.username === $route.params.user" class="options">
		<ui-switch v-model="only">{{ $t('@.only-not-followed') }}</ui-switch>
	</div>
	<mk-user-list v-if="!only" :make-promise="makePromise" :showFollows="true" :key="Math.random()">{{ $t('@.following') }}</mk-user-list>
	<mk-user-list v-else :make-promise="makePromiseDiff" :showFollows="true" :key="Math.random()">{{ $t('@.following') }}</mk-user-list>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import parseAcct from '../../../../../misc/acct/parse';

export default Vue.extend({
	data() {
		return {
			only: false,
			makePromise: cursor => this.$root.api('users/following', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
			makePromiseDiff: cursor => this.$root.api('users/following', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				diff: true,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
		};
	},
});
</script>

<style lang="stylus" scoped>
	.options
		margin 16px
</style>
