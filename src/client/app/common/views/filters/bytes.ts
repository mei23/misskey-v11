import Vue from 'vue';

Vue.filter('bytes', (v, digits = 0) => {
	if (v == null) return '?';
	if (v == 0) return '0';
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB',
		'e+27B', 'e+30B', 'e+33B', 'e+36B', 'e+39B', 'e+42B', 'e+45B', 'e+48B'];
	const isMinus = v < 0;
	if (isMinus) v = -v;
	const i = Math.floor(Math.log(v) / Math.log(1024));
	return (isMinus ? '-' : '') + (v / Math.pow(1024, i)).toFixed(digits).replace(/(\.[1-9]*)0+$/, '$1').replace(/\.$/, '') + sizes[i];
});
