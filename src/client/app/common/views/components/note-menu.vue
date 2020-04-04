<template>
<div style="position:initial">
	<mk-menu :source="source" :items="items" @closed="closed"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { url } from '../../../config';
import copyToClipboard from '../../../common/scripts/copy-to-clipboard';
import { faCopy } from '@fortawesome/free-regular-svg-icons';
import { faPlaneArrival, faPlaneDeparture, faUserFriends, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('common/views/components/note-menu.vue'),
	props: ['note', 'source'],
	data() {
		return {
			isFavorited: false,
		};
	},
	computed: {
		items(): any[] {
			return [{
				icon: faPaperPlane,
				text: this.$t('air-reply'),
				action: this.airReply
			}, {
				icon: 'at',
				text: this.$t('mention'),
				action: this.mention
			}, null, {
				icon: 'info-circle',
				text: this.$t('detail'),
				action: this.detail
			}, {
				icon: faPlaneArrival,
				text: this.$t('go-timeline'),
				action: this.goTimeline
			}, {
				icon: faPlaneDeparture,
				text: this.$t('up-timeline'),
				action: this.upTimeline
			}, {
				icon: faUserFriends,
				text: this.$t('go-follow-tl'),
				action: this.goFollowTL
			}, {
				icon: faCopy,
				text: this.$t('copy-content'),
				action: this.copyContent
			}, {
				icon: 'link',
				text: this.$t('copy-link'),
				action: this.copyLink
			}, (this.note.url || this.note.uri) ? {
				icon: 'external-link-square-alt',
				text: this.$t('remote'),
				action: () => {
					window.open(this.note.url || this.note.uri, '_blank');
				}
			} : undefined,
			null,
			this.isFavorited ? {
				icon: 'star',
				text: this.$t('unfavorite'),
				action: () => this.toggleFavorite(false)
			} : {
				icon: 'star',
				text: this.$t('favorite'),
				action: () => this.toggleFavorite(true)
			},
			this.note.userId == this.$store.state.i.id && (this.$store.state.i.pinnedNoteIds || []).includes(this.note.id) ? {
				icon: 'thumbtack',
				text: this.$t('unpin'),
				action: () => this.togglePin(false)
			} : undefined,
			this.pinnable ? {
				icon: 'thumbtack',
				text: this.$t('pin'),
				action: () => this.togglePin(true)
			} : undefined,
			...(this.note.userId == this.$store.state.i.id || this.$store.state.i.isAdmin || this.$store.state.i.isModerator ? [
				null, {
					icon: ['far', 'trash-alt'],
					text: this.$t('delete'),
					action: this.del
				},
				this.note.userId == this.$store.state.i.id ? {
					icon: ['fa', 'undo-alt'],
					text: this.$t('edit'),
					action: this.edit
				} : undefined]
				: []
			)]
			.filter(x => x !== undefined)
		},

		pinnable(): boolean {
			return this.note.userId == this.$store.state.i.id
				&& !(this.$store.state.i.pinnedNoteIds || []).includes(this.note.id)
				&& (this.note.visibility == 'public' || this.note.visibility == 'home')
				&& !this.note.localOnly;
		},
	},

	created() {
		this.$root.api('notes/state', {
			noteId: this.note.id
		}).then(state => {
			this.isFavorited = state.isFavorited;
		});
	},

	methods: {
		airReply() {
			this.$post({ airReply: this.note });
		},

		mention() {
			this.$post({ mention: this.note.user });
		},

		detail() {
			this.$router.push(`/notes/${this.note.id}`);
		},

		copyContent() {
			copyToClipboard(this.note.text);
			this.$root.dialog({
				type: 'success',
				splash: true
			});
		},

		copyLink() {
			copyToClipboard(`${url}/notes/${this.note.id}`);
			this.$root.dialog({
				type: 'success',
				splash: true
			});
		},

		togglePin(pin: boolean) {
			this.$root.api(pin ? 'i/pin' : 'i/unpin', {
				noteId: this.note.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.$emit('closed');
				this.destroyDom();
			}).catch(e => {
				if (e.id === '72dab508-c64d-498f-8740-a8eec1ba385a') {
					this.$root.dialog({
						type: 'error',
						text: this.$t('pin-limit-exceeded')
					});
				}
			});
		},

		del() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('delete-confirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('notes/delete', {
					noteId: this.note.id
				}).then(() => {
					this.$emit('closed');
					this.destroyDom();
				});
			});
		},

		edit() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('edit-confirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;
				this.$post({
					initialNote: Object.assign({ _edit: true }, this.note),
					reply: this.note.reply,
				});
			});
		},

		toggleFavorite(favorite: boolean) {
			this.$root.api(favorite ? 'notes/favorites/create' : 'notes/favorites/delete', {
				noteId: this.note.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.$emit('closed');
				this.destroyDom();
			});
		},

		goTimeline() {
			const date = new Date(new Date(this.note.createdAt).getTime() + 5000).toISOString();
			const host = this.note.user.host || '.';
			const q = `host:${host} until:${date}`;

			this.$router.push(`/search?q=${encodeURIComponent(q)}`);
		},

		upTimeline() {
			const date = new Date(new Date(this.note.createdAt).getTime() - 5000).toISOString();
			const host = this.note.user.host || '.';
			const q = `host:${host} since:${date}`;

			this.$router.push(`/search?q=${encodeURIComponent(q)}`);
		},

		goFollowTL() {
			const date = new Date(new Date(this.note.createdAt).getTime() + 5000).toISOString();
			const user = this.note.user.host ? `@${this.note.user.username}@${this.note.user.host}` : `@${this.note.user.username}`;
			const q = `follow:${user} until:${date}`;

			this.$router.push(`/search?q=${encodeURIComponent(q)}`);
		},

		closed() {
			this.$emit('closed');
			this.$nextTick(() => {
				this.destroyDom();
			});
		}
	}
});
</script>
