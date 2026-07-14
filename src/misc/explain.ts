// https://github.com/zamarawka/typeorm-explain/blob/8b5e798d6775b4c30713ae96695e4dcc4755b8ba/src/index.ts

import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { getConnection, ObjectLiteral, QueryBuilder, Connection } from 'typeorm';

type PostgresExplainParameters = {
	analyze?: boolean;
	verbose?: boolean;
	costs?: boolean;
	buffers?: boolean;
	timing?: boolean;
};

type FormatTypes = 'text' | 'xml' | 'json' | 'yaml';

type ExplainParameters = undefined | PostgresExplainParameters;

type ExplainBuilder = (
	originalQuery: string,
	explainParameters: ExplainParameters,
	format: FormatTypes,
) => string;

const explains: { [key: string]: ExplainBuilder } = {
	postgres(
		originalQuery: string,
		explainParameters: PostgresExplainParameters = {
			analyze: false,
			verbose: false,
			buffers: false,
		},
		format: FormatTypes,
	) {
		const boolParameters = Object.entries(explainParameters)
			.filter((argument): argument is [string, boolean] => typeof argument[1] === 'boolean')
			.map(([key, value]) => `${key} ${value}`);

		const explainParametersString = [...boolParameters, `FORMAT ${format.toUpperCase()}`]
			.join(', ')
			.toUpperCase();

		return `EXPLAIN (${explainParametersString}) ${originalQuery}`;
	},
};

export default async function explain<T extends ObjectLiteral>(
	qb: QueryBuilder<T>,
	explainParameters?: ExplainParameters,
	format: FormatTypes = 'text',
	connection: Connection = getConnection(),
) {
	const { type } = connection.driver.options;
	const [originalQuery, queryParameters] = qb.getQueryAndParameters();
	const explainBuilder: ExplainBuilder = explains[type];

	if (!explainBuilder) {
		const driversList = Object.keys(explains).join(',');

		throw new Error(
			`typeorm-explain currently support limited db drivers (${driversList}). Feel free open PR to support your driver: ${type}`,
		);
	}

	const query = explainBuilder(originalQuery, explainParameters, format);

	return connection.query(query, queryParameters);
}

export async function explain2<T extends ObjectLiteral>(qb: QueryBuilder<T>, name: string) {
	const dir = resolve(__dirname, '../../');
	const queryFile = resolve(dir, `_query_${name}.txt`);
	const explainFile = resolve(dir, `_explain_${name}.txt`);

	const [q, p] = qb.getQueryAndParameters();
	await writeFile(queryFile, `${q}\n\n${JSON.stringify(p, null, 2)}`);

	const r = await explain(qb) as { 'QUERY PLAN': string }[];
	const t = r.map(x => x['QUERY PLAN']).join('\n');
	await writeFile(explainFile, t);
}
