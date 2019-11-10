<template>
<div>
	<div v-if="$store.getters.isSignedIn && $store.state.i.host == null && $store.state.i.username === $route.params.user" class="options">
		<ui-switch v-model="only">{{ $t('@.only-not-following') }}</ui-switch>
	</div>
	<mk-user-list v-if="!only" :make-promise="makePromise" :showFollows="true" :key="Math.random()">{{ $t('@.followers') }}</mk-user-list>
	<mk-user-list v-else :make-promise="makePromiseDiff" :showFollows="true" :key="Math.random()">{{ $t('@.followers') }}</mk-user-list>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import parseAcct from '../../../../../misc/acct/parse';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n(''),

	data() {
		return {
			only: false,
			makePromise: cursor => this.$root.api('users/followers', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
			makePromiseDiff: cursor => this.$root.api('users/followers', {
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
