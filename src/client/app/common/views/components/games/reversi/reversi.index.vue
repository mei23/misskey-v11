<template>
<div class="phgnkghfpyvkrvwiajkiuoxyrdaqpzcx">
	<h1>{{ $t('title') }}</h1>
	<p>{{ $t('sub-title') }}</p>
	<div class="play">
		<input v-model="q" type="search" placeholder="@user" v-autocomplete="{ model: 'q', userOnly: true, localOnly: true }"/>
		<form-button primary round @click="match">{{ $t('invite') }}</form-button>
		<details>
			<summary>{{ $t('rule') }}</summary>
			<div>
				<p>{{ $t('rule-desc') }}</p>
				<dl>
					<dt><b>{{ $t('mode-invite') }}</b></dt>
					<dd>{{ $t('mode-invite-desc') }}</dd>
				</dl>
			</div>
		</details>
	</div>
	<section v-if="invitations.length > 0">
		<h2>{{ $t('invitations') }}</h2>
		<div class="invitation" v-for="i in invitations" :key="i.id" tabindex="-1" @click="accept(i)">
			<mk-avatar class="avatar" :user="i.parent"/>
			<span class="name"><b><mk-user-name :user="i.parent"/></b></span>
			<span class="username">@{{ i.parent.username }}</span>
			<mk-time :time="i.createdAt"/>
		</div>
	</section>
	<section v-if="myGames.length > 0">
		<h2>{{ $t('my-games') }}</h2>
		<div class="games" v-for="g in myGames" :key="g.id">
			<a class="game" tabindex="-1" @click.prevent="go(g)" :href="`/games/reversi/${g.id}`">
				<mk-avatar class="avatar" :user="getOtherUser(g)"/>
				<span><b><mk-user-name :user="getOtherUser(g)"/></b></span>
				<span class="state">{{ g.isEnded ? $t('game-state.ended') : $t('game-state.playing') }}</span>
				<mk-time :time="g.createdAt" />
			</a>
			<a class="re" @click="matchWith(getOtherUser(g))"><fa icon="gamepad"/></a>
		</div>
	</section>
	<section v-if="games.length > 0">
		<h2>{{ $t('all-games') }}</h2>
		<a class="game" v-for="g in games" :key="g.id" tabindex="-1" @click.prevent="go(g)" :href="`/games/reversi/${g.id}`">
			<mk-avatar class="avatar" :user="g.user1"/>
			<mk-avatar class="avatar" :user="g.user2"/>
			<span><b><mk-user-name :user="g.user1"/></b> vs <b><mk-user-name :user="g.user2"/></b></span>
			<span class="state">{{ g.isEnded ? $t('game-state.ended') : $t('game-state.playing') }}</span>
			<mk-time :time="g.createdAt" />
		</a>
	</section>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/components/games/reversi/reversi.index.vue'),
	data() {
		return {
			q: '',
			games: [],
			gamesFetching: true,
			gamesMoreFetching: false,
			myGames: [],
			matching: null,
			invitations: [],
			connection: null
		};
	},

	mounted() {
		if (this.$store.getters.isSignedIn) {
			this.connection = this.$root.stream.useSharedConnection('gamesReversi');

			this.connection.on('invited', this.onInvited);

			this.$root.api('games/reversi/games', {
				my: true
			}).then((games: any[]) => {
				this.myGames = games;
			});

			this.$root.api('games/reversi/invitations').then((invitations: any[]) => {
				this.invitations = this.invitations.concat(invitations);
			});
		}

		this.$root.api('games/reversi/games').then((games: any[]) => {
			this.games = games;
			this.gamesFetching = false;
		});
	},

	beforeDestroy() {
		if (this.connection) {
			this.connection.dispose();
		}
	},

	methods: {
		go(game) {
			this.$emit('go', game);
		},

		match() {
			const m = this.q.match(/^@(\w+)/);
			if (!m) return;
			const username = m[1];

			this.$root.api('users/show', {
				username
			}).catch((e: any) => {
				this.$root.dialog({
					type: 'error',
					text: e.message
				});
			}).then((user: any) => {
				this.matchWith(user);
			});
		},

		matchWith(user: any) {
			this.$root.api('games/reversi/match', {
				userId: user.id
			}).then((res: any) => {
				if (res == null) {
					this.$emit('matching', user);
				} else {
					this.$emit('go', res);
				}
			});
		},

		accept(invitation) {
			this.$root.api('games/reversi/match', {
				userId: invitation.parent.id
			}).then(game => {
				if (game) {
					this.$emit('go', game);
				}
			});
		},

		getOtherUser(game: any): any {
			return game.user1.id == this.$store.state.i.id ? game.user2 : game.user1;
		},

		onInvited(invite) {
			this.invitations.unshift(invite);
		}
	}
});
</script>

<style lang="stylus" scoped>
.phgnkghfpyvkrvwiajkiuoxyrdaqpzcx
	> h1
		margin 0
		padding 24px
		font-size 24px
		text-align center
		font-weight normal
		color #fff
		background linear-gradient(to bottom, var(--reversiBannerGradientStart), var(--reversiBannerGradientEnd))

		& + p
			margin 0
			padding 12px
			margin-bottom 12px
			text-align center
			font-size 14px
			border-bottom solid 1px var(--faceDivider)

	> .play
		margin 0 auto
		padding 0 16px
		max-width 500px
		text-align center

		> input
			margin 1em
			padding 1em
			font-size 16px
			width 250px
			color var(--inputText)
			background var(--desktopPostFormTextareaBg)
			border 1px solid var(--primaryAlpha01)
			border-radius 8px

		> details
			margin 8px 0

			> div
				padding 16px
				font-size 14px
				text-align left
				background var(--reversiDescBg)
				border-radius 8px

	> section
		margin 0 auto
		padding 0 16px 16px 16px
		max-width 500px
		border-top solid 1px var(--faceDivider)

		> h2
			margin 0
			padding 16px 0 8px 0
			font-size 16px
			font-weight bold

	.invitation
		margin 8px 0
		padding 8px
		color var(--text)
		background var(--face)
		box-shadow 0 2px 16px var(--reversiListItemShadow)
		border-radius 6px
		cursor pointer

		*
			pointer-events none
			user-select none

		&:focus
			border-color var(--primary)

		&:hover
			box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.05)

		&:active
			box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.1)

		> .avatar
			width 32px
			height 32px
			border-radius 100%

		> span
			margin 0 8px
			line-height 32px

	.games
		display flex

	.game, .re
		display inline-flex
		align-items center
		margin 4px
		padding 8px
		color var(--text)
		background var(--face)
		box-shadow 0 2px 16px var(--reversiListItemShadow)
		border-radius 6px
		cursor pointer

		*
			pointer-events none
			user-select none

		&:hover
			box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.05)

		&:active
			box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.1)

		> .avatar
			width 32px
			height 32px
			border-radius 100%

		> span
			margin 0 8px
			line-height 32px

	.game
		width 100%
</style>
