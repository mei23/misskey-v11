import { parse } from '../../../../mfm/parse';
import { sum, unique } from '../../../../prelude/array';
import { shouldMuteNote } from './should-mute-note';
import MkNoteMenu from '../views/components/note-menu.vue';
import MkReactionPicker from '../views/components/reaction-picker.vue';
import i18n from '../../i18n';

function focus(el, fn) {
	const target = fn(el);
	if (target) {
		if (target.hasAttribute('tabindex')) {
			target.focus();
		} else {
			focus(target, fn);
		}
	}
}

type Opts = {
	mobile?: boolean;
};

export default (opts: Opts = {}) => ({
	i18n: i18n(),

	data() {
		return {
			showContent: this.$store.state.device.alwaysOpenCw,
			hideThisNote: false,
			openingMenu: false
		};
	},

	computed: {
		keymap(): any {
			return {
				'r': () => this.reply(true),
				'e|a|plus': () => this.react(true),
				'q': () => this.renote(true),
				'f|b': this.favorite,
				'delete|ctrl+d': this.del,
				'up|k|shift+tab': this.focusBefore,
				'down|j|tab': this.focusAfter,
				//'esc': this.blur,
				'm|o': () => this.menu(true),
				's': this.toggleShowContent,
				'1': () => this.reactDirectly(this.$store.state.settings.reactions[0]),
				'2': () => this.reactDirectly(this.$store.state.settings.reactions[1]),
				'3': () => this.reactDirectly(this.$store.state.settings.reactions[2]),
				'4': () => this.reactDirectly(this.$store.state.settings.reactions[3]),
				'5': () => this.reactDirectly(this.$store.state.settings.reactions[4]),
				'6': () => this.reactDirectly(this.$store.state.settings.reactions[5]),
				'7': () => this.reactDirectly(this.$store.state.settings.reactions[6]),
				'8': () => this.reactDirectly(this.$store.state.settings.reactions[7]),
				'9': () => this.reactDirectly(this.$store.state.settings.reactions[8]),
				'0': () => this.reactDirectly(this.$store.state.settings.reactions[9]),
			};
		},

		isRenote(): boolean {
			return (this.note.renote &&
				this.note.text == null &&
				this.note.fileIds.length == 0 &&
				this.note.poll == null);
		},

		appearNote(): any {
			return this.isRenote ? this.note.renote : this.note;
		},

		isMyNote(): boolean {
			return this.$store.getters.isSignedIn && (this.$store.state.i.id === this.appearNote.userId);
		},

		reactionsCount(): number {
			return this.appearNote.reactionCounts
				? sum(Object.values(this.appearNote.reactionCounts))
				: 0;
		},

		title(): string {
			return '';
		},

		urls(): string[] {
			if (this.appearNote.text) {
				const ast = parse(this.appearNote.text);
				// TODO: 再帰的にURL要素がないか調べる
				const urls = unique(ast
					.filter(t => ((t.node.type == 'url' || t.node.type == 'link') && t.node.props.url && !t.node.props.silent))
					.map(t => t.node.props.url));

				// unique without hash
				// [ http://a/#1, http://a/#2, http://b/#3 ] => [ http://a/#1, http://b/#3 ]
				const removeHash = x => x.replace(/#[^#]*$/, '');

				return urls.reduce((array, url) => {
					const removed = removeHash(url);
					if (!array.map(x => removeHash(x)).includes(removed)) array.push(url);
					return array;
				}, []);
			} else {
				return null;
			}
		}
	},

	created() {
		this.hideThisNote = shouldMuteNote(this.$store.state.i, this.$store.state.settings, this.appearNote);
	},

	methods: {
		reply(viaKeyboard = false) {
			this.$root.$post({
				reply: this.appearNote,
				animation: !viaKeyboard,
				cb: () => {
					this.focus();
				}
			});
		},

		renote(viaKeyboard = false) {
			this.$root.$post({
				renote: this.appearNote,
				animation: !viaKeyboard,
				cb: () => {
					this.focus();
				}
			});
		},

		undoRenote() {
			this.$root.api('notes/delete', {
				noteId: this.appearNote.myRenoteId
			});
		},

		react(viaKeyboard = false) {
			this.blur();
			const w = this.$root.new(MkReactionPicker, {
				source: this.$refs.reactButton,
				showFocus: viaKeyboard,
				animation: !viaKeyboard
			});
			w.$once('chosen', reaction => {
				this.$root.api('notes/reactions/create', {
					noteId: this.appearNote.id,
					reaction: reaction
				}).then(() => {
					w.close();
				});
			});
			w.$once('closed', this.focus);
		},

		reactDirectly(reaction) {
			this.$root.api('notes/reactions/create', {
				noteId: this.appearNote.id,
				reaction: reaction
			});
		},

		undoReact(note) {
			const oldReaction = note.myReaction;
			if (!oldReaction) return;
			this.$root.api('notes/reactions/delete', {
				noteId: note.id
			});
		},

		favorite() {
			this.$root.api('notes/favorites/create', {
				noteId: this.appearNote.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			});
		},

		del() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('@.delete-confirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('notes/delete', {
					noteId: this.appearNote.id
				});
			});
		},

		menu(viaKeyboard = false) {
			if (this.openingMenu) return;
			this.openingMenu = true;
			const w = this.$root.new(MkNoteMenu, {
				source: this.$refs.menuButton,
				note: this.appearNote,
				animation: !viaKeyboard
			}).$once('closed', () => {
				this.openingMenu = false;
				this.focus();
			});
			this.$once('hook:beforeDestroy', () => {
				w.destroyDom();
			});
		},

		toggleShowContent() {
			this.showContent = !this.showContent;
		},

		focus() {
			this.$el.focus();
		},

		blur() {
			this.$el.blur();
		},

		focusBefore() {
			focus(this.$el, e => e.previousElementSibling);
		},

		focusAfter() {
			focus(this.$el, e => e.nextElementSibling);
		}
	}
});
