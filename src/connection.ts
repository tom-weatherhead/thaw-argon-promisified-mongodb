import { Db, MongoClient } from 'mongodb';

import { promisify } from 'thaw-argon-promisify';

import { createCollection, IPromisifiedCollection } from './collection';

export interface IPromisifiedConnection {
	destroy(): void;
	getCollection(
		databaseName: string,
		collectionName: string
	): IPromisifiedCollection;
}

class PromisifiedConnection implements IPromisifiedConnection {
	private connection?: Db;

	constructor(connection: Db) {
		this.connection = connection;
	}

	public destroy(): void {
		if (typeof this.connection !== 'undefined') {
			this.connection.close();
			this.connection = undefined;
		}
	}

	public getCollection(
		databaseName: string,
		collectionName: string
	): IPromisifiedCollection {
		if (typeof this.connection === 'undefined') {
			throw new Error(
				'getCollection() : The connection has already been destroyed'
			);
		}

		return createCollection(this.connection, databaseName, collectionName);
	}
}

export function createConnection(
	server: string,
	port: number,
	databaseName: string
): Promise<IPromisifiedConnection> {
	const databaseUrl = `mongodb://${server}:${port}/${databaseName}`;
	const options = {};

	return promisify(MongoClient.connect, MongoClient)(
		databaseUrl,
		options
	).then(
		(client: Db) =>
			// Promise.resolve(new PromisifiedConnection(client)) // This works
			new PromisifiedConnection(client) // This works too
	);
}
