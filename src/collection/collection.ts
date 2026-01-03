import {
  type AnyBulkWriteOperation,
  type CountDocumentsOptions,
  type Db,
  type EstimatedDocumentCountOptions,
  type Filter,
  type Collection as MongoCollection,
  ObjectId,
  type UpdateFilter,
  type WithoutId,
} from "mongodb";
import { MonarchError } from "../errors";
import type { AnyRelations } from "../relations/relations";
import { makeIndexes } from "../schema/indexes";
import { type AnySchema, Schema } from "../schema/schema";
import type { InferSchemaData, InferSchemaInput, SchemaInputWithId } from "../schema/type-helpers";
import { MonarchObjectId } from "../types/objectId";
import { MonarchType } from "../types/type";
import type { Index } from "../utils/type-helpers";
import { AggregationPipeline } from "./pipeline/aggregation";
import { BulkWriteQuery } from "./query/bulk-write";
import { DeleteManyQuery } from "./query/delete-many";
import { DeleteOneQuery } from "./query/delete-one";
import { DistinctQuery } from "./query/distinct";
import { FindQuery } from "./query/find";
import { FindOneQuery } from "./query/find-one";
import { FindOneAndDeleteQuery } from "./query/find-one-and-delete";
import { FindOneAndReplaceQuery } from "./query/find-one-and-replace";
import { FindOneAndUpdateQuery } from "./query/find-one-and-update";
import { InsertManyQuery } from "./query/insert-many";
import { InsertOneQuery } from "./query/insert-one";
import { ReplaceOneQuery } from "./query/replace-one";
import { UpdateManyQuery } from "./query/update-many";
import { UpdateOneQuery } from "./query/update-one";

/**
 * Collection interface for MongoDB operations.
 *
 */
export class Collection<TSchema extends AnySchema, TDbRelations extends Record<string, AnyRelations>> {
  private _collection: MongoCollection<InferSchemaData<TSchema>>;
  private _readyPromise: Promise<void>;

  /**
   * Creates a Collection instance.
   *
   * @param db - MongoDB database instance
   * @param schema - Schema definition
   * @param relations - Relation definitions
   */
  constructor(
    db: Db,
    public schema: TSchema,
    public relations: TDbRelations,
  ) {
    // create indexes
    if (schema.options.indexes) {
      const indexes = makeIndexes(schema.options.indexes);
      const indexesPromises = Object.entries(indexes).map(async ([key, [fields, options]]) => {
        await db.createIndex(schema.name, fields, options).catch((error) => {
          throw new MonarchError(`failed to create index '${key}': ${error}`);
        });
      });
      this._readyPromise = Promise.all(indexesPromises).then(() => undefined);
    } else {
      this._readyPromise = Promise.resolve();
    }
    this._collection = db.collection<InferSchemaData<TSchema>>(this.schema.name);
  }

  /**
   * Promise that resolves when collection indexes are created.
   */
  public get isReady() {
    return this._readyPromise;
  }

  /**
   * Returns the underlying MongoDB collection instance.
   *
   * @returns Native MongoDB collection
   */
  public raw() {
    return this._collection;
  }

  /**
   * Finds distinct values for a specified field.
   *
   * @param key - Field name
   * @param filter - Query filter
   * @returns DistinctQuery instance
   */
  public distinct<K extends keyof InferSchemaData<TSchema>>(key: K, filter: Filter<InferSchemaData<TSchema>> = {}) {
    return new DistinctQuery<any, any, Array<InferSchemaData<TSchema>[K]>>(
      this.schema,
      this.relations,
      this._collection as any,
      this._readyPromise,
      filter as any,
      key as any,
    );
  }

  /**
   * Finds documents matching the filter.
   *
   * @param filter - Query filter
   * @returns FindQuery instance
   */
  public find(filter: Filter<InferSchemaData<TSchema>> = {}) {
    return new FindQuery(this.schema, this.relations, this._collection, this._readyPromise, filter);
  }

  /**
   * Finds a document by its _id field.
   *
   * @param id - Document ID
   * @returns FindOneQuery instance
   */
  public findById(id: Index<SchemaInputWithId<TSchema>, "_id">) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneQuery(
      this.schema,
      this.relations,
      this._collection,
      this._readyPromise,
      // @ts-ignore
      { _id: isObjectIdType ? new ObjectId(id) : id },
    );
  }

  /**
   * Finds a document by its _id field and updates it.
   *
   * @param id - Document ID
   * @param update - Update operations
   * @returns FindOneAndUpdateQuery instance
   */
  public findByIdAndUpdate(
    id: Index<SchemaInputWithId<TSchema>, "_id">,
    update: UpdateFilter<InferSchemaData<TSchema>>,
  ) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneAndUpdateQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      // @ts-ignore
      { _id: isObjectIdType ? new ObjectId(id) : id },
      update,
    );
  }

  /**
   * Finds a document by its _id field and deletes it.
   *
   * @param id - Document ID
   * @returns FindOneAndDeleteQuery instance
   */
  public findByIdAndDelete(id: Index<SchemaInputWithId<TSchema>, "_id">) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneAndDeleteQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      // @ts-ignore
      { _id: isObjectIdType ? new ObjectId(id) : id },
    );
  }

  /**
   * Finds a single document matching the filter.
   *
   * @param filter - Query filter
   * @returns FindOneQuery instance
   */
  public findOne(filter: Filter<InferSchemaData<TSchema>>) {
    return new FindOneQuery(this.schema, this.relations, this._collection, this._readyPromise, filter);
  }

  /**
   * Finds a document and replaces it with a new document.
   *
   * @param filter - Query filter
   * @param replacement - Replacement document
   * @returns FindOneAndReplaceQuery instance
   */
  public findOneAndReplace(filter: Filter<InferSchemaData<TSchema>>, replacement: WithoutId<InferSchemaData<TSchema>>) {
    return new FindOneAndReplaceQuery(this.schema, this._collection, this._readyPromise, filter, replacement);
  }

  /**
   * Finds a document and updates it.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns FindOneAndUpdateQuery instance
   */
  public findOneAndUpdate(filter: Filter<InferSchemaData<TSchema>>, update: UpdateFilter<InferSchemaData<TSchema>>) {
    return new FindOneAndUpdateQuery(this.schema, this._collection, this._readyPromise, filter, update);
  }

  /**
   * Finds a document and deletes it.
   *
   * @param filter - Query filter
   * @returns FindOneAndDeleteQuery instance
   */
  public findOneAndDelete(filter: Filter<InferSchemaData<TSchema>>) {
    return new FindOneAndDeleteQuery(this.schema, this._collection, this._readyPromise, filter);
  }

  /**
   * Inserts a single document into the collection.
   *
   * @param data - Document to insert
   * @returns InsertOneQuery instance
   */
  public insertOne(data: InferSchemaInput<TSchema>) {
    return new InsertOneQuery(this.schema, this._collection, this._readyPromise, data);
  }

  /**
   * Inserts multiple documents into the collection.
   *
   * @param data - Array of documents to insert
   * @returns InsertManyQuery instance
   */
  public insertMany(data: InferSchemaInput<TSchema>[]) {
    return new InsertManyQuery(this.schema, this._collection, this._readyPromise, data);
  }

  /**
   * Performs multiple write operations in bulk.
   *
   * @param data - Array of bulk write operations
   * @returns BulkWriteQuery instance
   */
  public bulkWrite(data: AnyBulkWriteOperation<InferSchemaData<TSchema>>[]) {
    return new BulkWriteQuery(this.schema, this._collection, this._readyPromise, data);
  }

  /**
   * Replaces a single document matching the filter.
   *
   * @param filter - Query filter
   * @param replacement - Replacement document
   * @returns ReplaceOneQuery instance
   */
  public replaceOne(filter: Filter<InferSchemaData<TSchema>>, replacement: WithoutId<InferSchemaData<TSchema>>) {
    return new ReplaceOneQuery(this.schema, this._collection, this._readyPromise, filter, replacement);
  }

  /**
   * Updates a single document matching the filter.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns UpdateOneQuery instance
   */
  public updateOne(filter: Filter<InferSchemaData<TSchema>>, update: UpdateFilter<InferSchemaData<TSchema>>) {
    return new UpdateOneQuery(this.schema, this._collection, this._readyPromise, filter, update);
  }

  /**
   * Updates multiple documents matching the filter.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns UpdateManyQuery instance
   */
  public updateMany(filter: Filter<InferSchemaData<TSchema>>, update: UpdateFilter<InferSchemaData<TSchema>>) {
    return new UpdateManyQuery(this.schema, this._collection, this._readyPromise, filter, update);
  }

  /**
   * Deletes a single document matching the filter.
   *
   * @param filter - Query filter
   * @returns DeleteOneQuery instance
   */
  public deleteOne(filter: Filter<InferSchemaData<TSchema>>) {
    return new DeleteOneQuery(this.schema, this._collection, this._readyPromise, filter);
  }

  /**
   * Deletes multiple documents matching the filter.
   *
   * @param filter - Query filter
   * @returns DeleteManyQuery instance
   */
  public deleteMany(filter: Filter<InferSchemaData<TSchema>>) {
    return new DeleteManyQuery(this.schema, this._collection, this._readyPromise, filter);
  }

  /**
   * Creates an aggregation pipeline for complex queries.
   *
   * @returns AggregationPipeline instance
   */
  public aggregate<TOutput extends any[]>() {
    return new AggregationPipeline<TSchema, TOutput[]>(this.schema, this._collection, this._readyPromise);
  }

  /**
   * Counts documents matching the filter.
   *
   * @param filter - Query filter
   * @param options - Count options
   * @returns Promise resolving to document count
   */
  public async countDocuments(filter: Filter<InferSchemaData<TSchema>> = {}, options?: CountDocumentsOptions) {
    return await this._collection.countDocuments(filter, options);
  }

  /**
   * Estimates total document count in the collection.
   *
   * @param options - Estimation options
   * @returns Promise resolving to estimated count
   */
  public async estimatedDocumentCount(options?: EstimatedDocumentCountOptions) {
    return await this._collection.estimatedDocumentCount(options);
  }
}
