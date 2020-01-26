<template>
<div class="cudqjmnl">
	<p class="fetching" v-if="!list" style="text-align: center; color: var(--text);"><fa icon="spinner" pulse fixed-width/>{{ $t('@.loading') }}<mk-ellipsis/></p>
	<ui-card v-if="list">
		<template #title><fa :icon="faList"/> {{ list.title }}</template>

		<section>
			<ui-button @click="rename"><fa :icon="faICursor"/> {{ $t('rename') }}</ui-button>
			<ui-button @click="del"><fa :icon="faTrashAlt"/> {{ $t('delete') }}</ui-button>
			<ui-switch v-model="list.hideFromHome" @change="update">{{ $t('hide-from-home') }}</ui-switch>
			<ui-switch v-model="list.mediaOnly" @change="update">{{ $t('media-only') }}</ui-switch>
		</section>
	</ui-card>

	<ui-card v-if="list">
		<template #title><fa :icon="faUsers"/> {{ $t('users') }}</template>
		<div style="margin: 8px">
			<a @click="addUser">{{ $t('add-user') }}</a>
		</div>
		<section>
			<sequential-entrance animation="entranceFromTop" delay="25">
				<div class="phcqulfl" v-for="user in users" :key="user.id">
					<div>
						<a :href="user | userPage">
							<mk-avatar class="avatar" :user="user" :disable-link="true"/>
						</a>
					</div>
					<div>
						<header>
							<b><mk-user-name :user="user"/></b>
							<span class="username">@{{ user | acct }}</span>
						</header>
						<div>
							<a @click="remove(user)">{{ $t('remove-user') }}</a>
						</div>
					</div>
				</div>
			</sequential-entrance>
		</section>
	</ui-card>

	<ui-card v-if="list">
		<template #title><fa :icon="faUsers"/> {{ $t('hosts') }}</template>
		<div style="margin: 8px">
			<a @click="addHost">{{ $t('add-host') }}</a>
		</div>
		<section>
			<sequential-entrance animation="entranceFromTop" delay="25">
				<div class="hostsfl" v-for="host in list.hosts" :key="host">
					<div>
						{{ host }}
					</div>
					<div>
						<a @click="removeHost(host)">{{ $t('remove-host') }}</a>
					</div>
				</div>
			</sequential-entrance>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faList, faICursor, faUsers } from '@fortawesome/free-solid-svg-icons';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';

export default Vue.extend({
	i18n: i18n('common/views/components/user-list-editor.vue'),

	props: {
		listId: {
			required: true
		}
	},

	data() {
		return {
			list: null,
			users: [],
			faList, faICursor, faTrashAlt, faUsers
		};
	},

	mounted() {
		this.fetchList();
	},

	methods: {
		fetchList() {
			this.$root.api('users/lists/show', {
				listId: this.listId
			}).then((list: any) => {
				this.list = list;
				this.fetchUsers();
			});
		},

		fetchUsers() {
			this.$root.api('users/show', {
				userIds: this.list.userIds
			}).then((users: any[]) => {
				this.users = users.sort((a, b) => a.username.localeCompare(b.username));
			});
		},

		update() {
			this.$root.api('users/lists/update', {
				listId: this.list.id,
				title: this.list.title,
				hideFromHome: this.list.hideFromHome,
				mediaOnly: this.list.mediaOnly,
			}).then((list: any) => {
				this.list = list;
			});
		},
		rename() {
			this.$root.dialog({
				title: this.$t('rename'),
				input: {
					default: this.list.title
				}
			}).then(({ canceled, result: title }) => {
				if (canceled) return;
				this.$root.api('users/lists/update', {
					listId: this.list.id,
					title: title
				}).then((list: any) => {
					this.list = list;
				});
			});
		},

		del() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('delete-are-you-sure').replace('$1', this.list.title),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('users/lists/delete', {
					listId: this.list.id
				}).then(() => {
					this.$root.dialog({
						type: 'success',
						text: this.$t('deleted')
					});
					this.$emit('deleted');
				}).catch(e => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			});
		},

		remove(user: any) {
			this.$root.api('users/lists/pull', {
				listId: this.list.id,
				userId: user.id
			}).then(() => {
				this.fetchList();
			});
		},

		addUser() {
			this.$root.dialog({
				title: this.$t('enter-username'),
				user: true
			}).then(({ canceled, result: user }) => {
				if (canceled) return;
				this.$root.api('users/lists/push', {
					listId: this.list.id,
					userId: user.id
				}).then(() => {
					this.fetchList();
				});
			});
		},

		addHost() {
			this.$root.dialog({
				title: this.$t('add-host'),
				input: { }
			}).then(({ canceled, result: host }) => {
				if (canceled) return;
				this.$root.api('users/lists/push-host', {
					listId: this.list.id,
					host
				}).then(() => {
					this.fetchList();
				});
			});
		},

		removeHost(host: string) {
			this.$root.api('users/lists/pull-host', {
				listId: this.list.id,
				host
			}).then(() => {
				this.fetchList();
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.cudqjmnl
	.phcqulfl
		display flex
		padding 16px 0
		border-top solid 1px var(--faceDivider)

		> div:first-child
			> a
				> .avatar
					width 64px
					height 64px

		> div:last-child
			flex 1
			padding-left 16px

			@media (max-width 500px)
				font-size 14px

			> header
				> .username
					margin-left 8px
					opacity 0.7

	.hostsfl
		margin-bottom 16px
</style>
