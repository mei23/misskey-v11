<template>
<div style="position:initial">
	<mk-menu :source="source" :items="items" @closed="closed"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('common/views/components/list-menu.vue'),

	props: ['user', 'source'],

	data() {
		return {
			lists: [],
			_listId: null,
			faPlus, faMinus
		};
	},

	created() {
		this.$root.api('users/lists/list', {
			userId: this.user.id
		}).then((lists: any[]) => {
			this.lists = lists;
		});
	},

	computed: {
		items() {
			let menu = [{
				icon: faPlus,
				text: this.$t('push-to-list'),
				action: this.pushList
			}, ...(
				this.lists.map((list: any) => ({
					icon: faMinus,
					text: this.$t('pull-from-list').replace('{}', list.title),
					action: this.pullList,
					actionArg: list.id
				}))
			)] as any;
			return menu;
		},
	},

	methods: {
		closed() {
			this.$nextTick(() => {
				this.destroyDom();
			});
		},

		async pushList() {
			const t = this.$t('select-list'); // なぜか後で参照すると null になるので最初にメモリに確保しておく
			const lists = await this.$root.api('users/lists/list');
			const { canceled, result: listId } = await this.$root.dialog({
				type: null,
				title: t,
				select: {
					items: lists.map(list => ({
						value: list.id, text: list.title
					}))
				},
				showCancelButton: true
			});
			if (canceled) return;
			await this.$root.api('users/lists/push', {
				listId: listId,
				userId: this.user.id
			});
			this.$root.dialog({
				type: 'success',
				splash: true
			});
		},

		async pullList(listId: any) {
			if (!await this.getConfirmed(this.$t('pull-list-confirm'))) return;

			this.$root.api('users/lists/pull', {
				listId: listId,
				userId: this.user.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			});
		},

		async getConfirmed(text: string): Promise<Boolean> {
			const confirm = await this.$root.dialog({
				type: 'warning',
				showCancelButton: true,
				title: 'confirm',
				text,
			});

			return !confirm.canceled;
		},
	}
});
</script>
