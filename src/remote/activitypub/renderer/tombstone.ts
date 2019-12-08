export default (id: string, formerType?: string) => {
	const object = {
		id,
		type: 'Tombstone',
	} as {
		id: string;
		type: string;
		formerType?: string;
	};

	if (formerType) object.formerType = formerType;

	return object;
};
