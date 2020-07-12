<template>
<div class="mkw-words">
	<ui-container :show-header="!props.compact">
		<template #header><fa :icon="faChartLine"/>{{ $t('@.widgets.words') }}</template>

		<div class="mkw-words--body" :data-mobile="platform == 'mobile'">
			<mk-trend-words/>
		</div>
	</ui-container>
</div>
</template>

<script lang="ts">
import define from '../../../common/define-widget';
import i18n from '../../../i18n';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';

export default define({
	name: 'words',
	props: () => ({
		compact: false
	})
}).extend({
	i18n: i18n('common/views/widgets/words.vue'),
	data() {
		return {
			faChartLine
		}
	},
	methods: {
		func() {
			this.props.compact = !this.props.compact;
			this.save();
		}
	}
});
</script>
