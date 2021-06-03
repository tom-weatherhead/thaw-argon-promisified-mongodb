import { Collection, Db, ObjectID } from 'mongodb';

import { promisify } from 'thaw-argon-promisify';

export interface IPromisifiedCollection {
	// Create (CRUD part 1 of 4)
	createOne(dataToInsert: any): Promise<any>;

	// Read (CRUD part 2 of 4)
	read(criteria: any): Promise<any[]>;
	readOneById(id: string): Promise<any>;
	readAll(): Promise<any[]>;

	// Update (CRUD part 3 of 4)
	updateOneById(id: string, replacementData: any): Promise<any>;

	// Delete (CRUD part 4 of 4)
	deleteOneById(id: string): Promise<boolean>;
	deleteAll(): Promise<boolean>;
}

interface IDropCollectionError {
	name: string;
	errmsg: string;
	ok: number;
}

// critter() : The Criteria Generator.

function critter(id: string): any {
	let criteria: any = {};

	// Prevent 'prettier' from removing the quotes around '_id';
	// they are necessary.
	criteria['_id'] = new ObjectID(id);

	return criteria;
}
class PromisifiedCollection implements IPromisifiedCollection {
	private readonly collection: Collection;

	constructor(collection: Collection) {
		this.collection = collection;
	}

	public createOne(dataToInsert: any): Promise<any> {
		return promisify(this.collection.insert, this.collection)(dataToInsert);
	}

	public read(criteria = {}): Promise<any[]> {
		const cursor = this.collection.find(criteria);

		return promisify(cursor.toArray, cursor)();
	}

	public readOneById(id: string): Promise<any> {
		return promisify(this.collection.findOne, this.collection)(critter(id));
	}

	public readAll(): Promise<any[]> {
		return this.read({});
	}

	public updateOneById(id: string, replacementData: any): Promise<any> {
		// options: { safe?: any; remove?: boolean; upsert?: boolean; new?: boolean },

		return promisify(this.collection.findAndModify, this.collection)(
			critter(id), // query
			[], // sort: any[]
			replacementData, // doc
			{ remove: false, upsert: false } // options
		);
		/* .then((result: any) => {
				return Promise.resolve(result); // Returns the old version of the record
			})
			.catch((error: Error) => {
				console.error(
					'updateOneById() : error is',
					typeof error,
					error
				);

				return Promise.reject(error);
			}); */
	}

	public deleteOneById(id: string): Promise<boolean> {
		return promisify(this.collection.findAndRemove, this.collection)(
			critter(id),
			undefined,
			undefined
		)
			.then((result: any) => {
				console.log(
					'deleteOneById() : result is',
					typeof result,
					result
				);

				if (result !== null) {
					console.log('Record was found and removed.');
				} else {
					console.log('Record was not found.');
				}

				return Promise.resolve(result !== null);
			})
			.catch((error: Error) => {
				console.error(
					'deleteOneById() : error is',
					typeof error,
					error
				);

				return Promise.reject(error);
			});
	}

	public deleteAll(): Promise<boolean> {
		return promisify(this.collection.drop, this.collection)()
			.then((result: any) => Promise.resolve(true))
			.catch((error: any) => {
				const errorCast = error as IDropCollectionError;

				if (
					typeof errorCast === 'undefined' ||
					errorCast.errmsg !== 'ns not found'
				) {
					return Promise.reject(error);
				} else {
					return Promise.resolve(false);
				}
			});
	}
}

export function createCollection(
	client: Db,
	databaseName: string,
	collectionName: string
): IPromisifiedCollection {
	return new PromisifiedCollection(
		client.db(databaseName).collection(collectionName)
	);
}
