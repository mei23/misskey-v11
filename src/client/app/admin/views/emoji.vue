<template>
<div>
	<ui-card>
		<template #title><fa icon="plus"/> {{ $t('add-emoji.title') }}</template>
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-input v-model="name">
					<span>{{ $t('add-emoji.name') }}</span>
					<template #desc>{{ $t('add-emoji.name-desc') }}</template>
				</ui-input>
				<ui-input v-model="category" :datalist="categoryList">
					<span>{{ $t('add-emoji.category') }}</span>
				</ui-input>
				<ui-input v-model="aliases">
					<span>{{ $t('add-emoji.aliases') }}</span>
					<template #desc>{{ $t('add-emoji.aliases-desc') }}</template>
				</ui-input>
			</ui-horizon-group>
			<ui-input v-model="url">
				<template #icon><fa icon="link"/></template>
				<span>{{ $t('add-emoji.url') }}</span>
			</ui-input>
			<ui-info>{{ $t('add-emoji.info') }}</ui-info>
			<ui-button @click="add">{{ $t('add-emoji.add') }}</ui-button>
		</section>
	</ui-card>

	<ui-card>
		<template #title><fa :icon="faGrin"/> {{ $t('emojis.title') }}</template>
		<section v-for="emoji in emojis" :key="emoji.name" class="oryfrbft">
			<div>
				<img :src="emoji.url" :alt="emoji.name" style="width: 64px;"/>
			</div>
			<div>
				<ui-horizon-group>
					<ui-input v-model="emoji.name">
						<span>{{ $t('add-emoji.name') }}</span>
					</ui-input>
					<ui-input v-model="emoji.category" :datalist="categoryList">
						<span>{{ $t('add-emoji.category') }}</span>
					</ui-input>
					<ui-input v-model="emoji.aliases">
						<span>{{ $t('add-emoji.aliases') }}</span>
					</ui-input>
				</ui-horizon-group>
				<ui-input v-model="emoji.url">
					<template #icon><fa icon="link"/></template>
					<span>{{ $t('add-emoji.url') }}</span>
				</ui-input>
				<ui-horizon-group class="fit-bottom">
					<ui-button @click="updateEmoji(emoji)"><fa :icon="['far', 'save']"/> {{ $t('emojis.update') }}</ui-button>
					<ui-button @click="removeEmoji(emoji)"><fa :icon="['far', 'trash-alt']"/> {{ $t('emojis.remove') }}</ui-button>
				</ui-horizon-group>
			</div>
		</section>
		<ui-button v-if="existMore" @click="fetchEmojis('local')">{{ $t('@.load-more') }}</ui-button>
	</ui-card>

	<ui-card>
		<template #title><fa :icon="faGrin"/> {{ $t('emojis.title') }}</template>
		<section v-for="emoji in remoteEmojis" :key="emoji.name" class="remotebft" style="padding: 16px 32px">
			<div class="image">
				<img :src="emoji.url" :alt="emoji.name" style="width: 32px;"/>
			</div>
			<div class="detail">
				<div>{{ `${emoji.name}@${emoji.host}` }}</div>
			</div>
		</section>

		<ui-button v-if="remoteExistMore" @click="fetchEmojis('remote')">{{ $t('@.load-more') }}</ui-button>
	</ui-card>

</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';
import { faGrin } from '@fortawesome/free-regular-svg-icons';
import { unique } from '../../../../prelude/array';

export default Vue.extend({
	i18n: i18n('admin/views/emoji.vue'),
	data() {
		return {
			name: '',
			category: '',
			url: '',
			aliases: '',
			limit: 2,
			emojis: [],
			existMore: false,
			offset: 0,
			remoteEmojis: [],
			remoteExistMore: false,
			remoteOffset: 0,
			faGrin
		};
	},

	mounted() {
		this.fetchEmojis();
	},

	computed: {
		categoryList() {
			return unique(this.emojis.map((x: any) => x.category || '').filter((x: string) => x !== ''));
		}
	},

	methods: {
		add() {
			this.$root.api('admin/emoji/add', {
				name: this.name,
				category: this.category,
				url: this.url,
				aliases: this.aliases.split(' ').filter(x => x.length > 0)
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('add-emoji.added')
				});
				this.fetchEmojis();
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		fetchEmojis(kind?: string) {
			if (!kind || kind === 'local') {
				this.$root.api('admin/emoji/list', {
					remote: false,
					offset: this.offset,
					limit: this.limit + 1,
				}).then((emojis: any[]) => {
					if (emojis.length === this.limit + 1) {
						emojis.pop();
						this.existMore = true;
					} else {
						this.existMore = false;
					}
					for (const e of emojis) {
						e.aliases = (e.aliases || []).join(' ');
					}
					this.emojis = emojis;
					this.offset += emojis.length;
				});
			}

			if (!kind || kind === 'remote') {
				this.$root.api('admin/emoji/list', {
					remote: true,
					offset: this.remoteOffset,
					limit: this.limit + 1,
				}).then((emojis: any[]) => {
					if (emojis.length === this.limit + 1) {
						emojis.pop();
						this.remoteExistMore = true;
					} else {
						this.remoteExistMore = false;
					}

					this.remoteEmojis = emojis;
					this.remoteOffset += emojis.length;
				});
			}
		},

		updateEmoji(emoji) {
			this.$root.api('admin/emoji/update', {
				id: emoji.id,
				name: emoji.name,
				category: emoji.category,
				url: emoji.url,
				aliases: emoji.aliases.split(' ').filter(x => x.length > 0)
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('updated')
				});
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		removeEmoji(emoji) {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('remove-emoji.are-you-sure').replace('$1', emoji.name),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('admin/emoji/remove', {
					id: emoji.id
				}).then(() => {
					this.$root.dialog({
						type: 'success',
						text: this.$t('remove-emoji.removed')
					});
					this.fetchEmojis();
				}).catch(e => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.oryfrbft
	@media (min-width 500px)
		display flex

	> div:first-child
		@media (max-width 500px)
			padding-bottom 16px

		> img
			vertical-align bottom

	> div:last-child
		flex 1

		@media (min-width 500px)
			padding-left 16px

.remotebft
	display flex

	> div.image
		padding-bottom 16px

		> img
			vertical-align bottom

	> div.detail
		flex 1
		padding-left 16px

</style>
