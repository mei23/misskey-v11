<template>
<div class="hkcxmtwj">
	<ui-switch v-model="v"><mfm :text="script.interpolate(value.text)" :key="Math.random()" :plain="true" :nowrap="true" :is-note="false" :i="$store.state.i" /></ui-switch>
</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		value: {
			required: true
		},
		script: {
			required: true
		}
	},

	data() {
		return {
			v: this.value.default,
		};
	},

	watch: {
		v() {
			this.script.aiScript.updatePageVar(this.value.name, this.v);
			this.script.eval();
		}
	}
});
</script>

<style lang="stylus" scoped>
.hkcxmtwj
	display inline-block
	margin 16px auto

	& + .hkcxmtwj
		margin-left 16px

</style>
