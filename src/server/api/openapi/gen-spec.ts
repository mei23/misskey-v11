import endpoints from '../endpoints';
import { Context } from 'cafy';
import config from '../../../config';
import { errors as basicErrors } from './errors';
import { schemas } from './schemas';
import { convertOpenApiSchema } from '../../../misc/schema';
import { getDescription } from './description';
import { repositoryUrl } from '../../../const.json';

export function genOpenapiSpec(lang = 'ja-JP') {
	const spec = {
		openapi: '3.0.0',

		info: {
			version: 'v1',
			title: 'Misskey API',
			description: getDescription(lang),
			'x-logo': { url: '/assets/api-doc.png' }
		},

		externalDocs: {
			description: 'Repository',
			url: repositoryUrl
		},

		servers: [{
			url: config.apiUrl
		}],

		paths: {} as any,

		components: {
			schemas: schemas,

			securitySchemes: {
				ApiKeyAuth: {
					type: 'apiKey',
					in: 'body',
					name: 'i'
				}
			}
		}
	};

	function genProps(props: { [key: string]: Context; }) {
		const properties = {} as any;

		for (const [k, v] of Object.entries(props)) {
			properties[k] = genProp(v);
		}

		return properties;
	}

	function genProp(param: Context): any {
		const required = param.name === 'Object' ? (param as any).props ? Object.entries((param as any).props).filter(([k, v]: any) => !v.isOptional).map(([k, v]) => k) : [] : [];
		return {
			description: (param.data || {}).desc,
			default: (param.data || {}).default,
			deprecated: (param.data || {}).deprecated,
			...((param.data || {}).default ? { default: (param.data || {}).default } : {}),
			type: param.name === 'ID' ? 'string' : param.name.toLowerCase(),
			...(param.name === 'ID' ? { example: 'xxxxxxxxxxxxxxxxxxxxxxxx', format: 'id' } : {}),
			nullable: param.isNullable,
			...(param.name === 'String' ? {
				...((param as any).enum ? { enum: (param as any).enum } : {}),
				...((param as any).minLength ? { minLength: (param as any).minLength } : {}),
				...((param as any).maxLength ? { maxLength: (param as any).maxLength } : {}),
			} : {}),
			...(param.name === 'Number' ? {
				...((param as any).minimum ? { minimum: (param as any).minimum } : {}),
				...((param as any).maximum ? { maximum: (param as any).maximum } : {}),
			} : {}),
			...(param.name === 'Object' ? {
				...(required.length > 0 ? { required } : {}),
				properties: (param as any).props ? genProps((param as any).props) : {}
			} : {}),
			...(param.name === 'Array' ? {
				items: (param as any).ctx ? genProp((param as any).ctx) : {}
			} : {})
		};
	}

	for (const endpoint of endpoints.filter(ep => !ep.meta.secure && !ep.name.startsWith('admin/'))) {
		const porops = {} as any;
		const errors = {} as any;

		if (endpoint.meta.errors) {
			for (const e of Object.values(endpoint.meta.errors)) {
				errors[e.code] = {
					value: {
						error: e
					}
				};
			}
		}

		if (endpoint.meta.params) {
			for (const [k, v] of Object.entries(endpoint.meta.params)) {
				if (v.validator.data == null) v.validator.data = {};
				if (v.desc) v.validator.data.desc = v.desc[lang];
				if (v.deprecated) v.validator.data.deprecated = v.deprecated;
				if (v.default) v.validator.data.default = v.default;
				porops[k] = v.validator;
			}
		}

		const required = endpoint.meta.params ? Object.entries(endpoint.meta.params).filter(([k, v]) => !v.validator.isOptional).map(([k, v]) => k) : [];

		const schema = {
			type: 'object',
			...(required.length > 0 ? { required } : {}),
			properties: endpoint.meta.params ? genProps(porops) : {}
		};

		const resSchema = endpoint.meta.res ? convertOpenApiSchema(endpoint.meta.res) : {};

		let desc = (endpoint.meta.desc ? endpoint.meta.desc[lang] : 'No description provided.') + '\n\n';
		desc += `**Credential required**: *${endpoint.meta.requireCredential ? 'Yes' : 'No'}*`;

		if (endpoint.meta.kind) {
			const kind = endpoint.meta.kind;
			desc += ` / **Permission**: *${kind}*`;
		}

		if (endpoint.meta.requireAdmin) {
			desc += ' / Require admin';
		}

		if (endpoint.meta.requireModerator) {
			desc += ' / Require moderator';
		}

		if (endpoint.meta.allowGet) {
			desc += ' / GET Supported';
		}

		if (endpoint.meta.secure) {
			desc += ' / Secure';
		}

		const info = {
			operationId: endpoint.name,
			summary: endpoint.name,
			description: desc,
			externalDocs: {
				description: 'Source code',
				url: `${repositoryUrl}/src/server/api/endpoints/${endpoint.name}.ts`
			},
			...(endpoint.meta.tags ? {
				tags: [endpoint.meta.tags[0]]
			} : {}),
			...(endpoint.meta.requireCredential ? {
				security: [{
					ApiKeyAuth: []
				}]
			} : {}),
			requestBody: {
				required: true,
				content: endpoint.meta.requireFile ? {
					'multipart/form-data': { schema }
				} : {
					'application/json': { schema }
				}
			},
			responses: {
				...(endpoint.meta.res ? {
					'200': {
						description: 'OK (with results)',
						content: {
							'application/json': {
								schema: resSchema
							}
						}
					}
				} : {
					'204': {
						description: 'OK (without any results)',
					}
				}),
				'400': {
					description: 'Client error',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Error'
							},
							examples: { ...errors, ...basicErrors['400'] }
						}
					}
				},
			}
		};

		spec.paths['/' + endpoint.name] = {
			post: info
		};
	}

	return spec;
}
