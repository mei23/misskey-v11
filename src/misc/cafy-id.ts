import * as mongo from 'mongodb';
import { Context } from 'cafy';
import isObjectId from './is-objectid';

/**
 * ObjectIDまたはObjectIDに変換可能なstringか
 */
const isValidId = (x: any) => mongo.ObjectID.isValid(x);

export const transform = (x: string | mongo.ObjectID | null | undefined): mongo.ObjectID | null | undefined => {
	if (x === undefined) return undefined;
	if (x === null) return null;

	if (isValidId(x) && !isObjectId(x)) {
		return new mongo.ObjectID(x);
	} else {
		return x as mongo.ObjectID;
	}
};
export const transformMany = (xs: (string | mongo.ObjectID)[]): (mongo.ObjectID | null | undefined)[] | null => {
	if (xs == null) return null;

	return xs.map(x => transform(x));
};

export type ObjectId = mongo.ObjectID;

/**
 * ID
 */
export default class ID<Maybe = string> extends Context<string | Maybe> {
	public readonly name = 'ID';

	constructor(optional = false, nullable = false) {
		super(optional, nullable);

		this.push((v: any) => {
			if (!isObjectId(v) && !isValidId(v)) {
				return new Error('must-be-an-id');
			}
			return true;
		});
	}

	public getType() {
		return super.getType('String');
	}

	public makeOptional(): ID<undefined> {
		return new ID(true, false);
	}

	public makeNullable(): ID<null> {
		return new ID(false, true);
	}

	public makeOptionalNullable(): ID<undefined | null> {
		return new ID(true, true);
	}
}
