<template>
<div>
	<div><mfm :text="script.interpolate(value.title)" :key="Math.random()" :plain="true" :nowrap="true" :is-note="false" :i="$store.state.i" /></div>
	<ui-radio v-for="x in value.values" v-model="v" :value="x" :key="x">
		<mfm :text="x" :key="Math.random()" :plain="true" :nowrap="true" :is-note="false" :i="$store.state.i" />
	</ui-radio>
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
</style>
