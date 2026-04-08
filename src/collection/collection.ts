import {
  type AnyBulkWriteOperation,
  type CountDocumentsOptions,
  type Db,
  type Document,
  type EstimatedDocumentCountOptions,
  type Collection as MongoCollection,
  type Filter as MongoFilter,
  ObjectId,
  type WithoutId,
} from "mongodb";
import type { AnyRelation } from "../relations/relations";
import { type AnySchema, Schema } from "../schema/schema";
import type { DistinctFilter, Filter, InferSchemaData, InferSchemaInput, UpdateFilter } from "../schema/type-helpers";
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
export class Collection<TSchema extends AnySchema, TRelations extends Record<string, Record<string, AnyRelation>>> {
  protected collection: MongoCollection<InferSchemaData<TSchema>>;

  /**
   * Creates a Collection instance.
   *
   * @param db - MongoDB database instance
   * @param schema - Schema definition
   * @param relations - Relation definitions
   */
  constructor(
    db: Db,
    protected readyPromise: Promise<void>,
    protected relations: TRelations,
    public readonly schema: TSchema,
  ) {
    this.collection = db.collection<InferSchemaData<TSchema>>(this.schema.name);
  }

  /**
   * Promise that resolves when this collection's initialization tasks complete.
   * This includes collection creation, index creation and document validation setup.
   */
  public get isReady() {
    return this.readyPromise;
  }

  /**
   * Returns the underlying MongoDB collection instance.
   *
   * @returns Native MongoDB collection
   */
  public raw() {
    return this.collection;
  }

  /**
   * Finds distinct values for a specified field.
   *
   * @param key - Field name
   * @param filter - Query filter
   * @returns DistinctQuery instance
   */
  public distinct<K extends keyof DistinctFilter<TSchema>>(key: K, filter: Filter<TSchema> = {}) {
    return new DistinctQuery(this.schema, this.collection, this.readyPromise, filter, key);
  }

  /**
   * Finds documents matching the filter.
   *
   * @param filter - Query filter
   * @returns FindQuery instance
   */
  public find(filter: Filter<TSchema> = {}) {
    return new FindQuery(this.schema, this.collection, this.readyPromise, this.relations, filter);
  }

  /**
   * Finds a document by its _id field.
   *
   * @param id - Document ID
   * @returns FindOneQuery instance
   */
  public findById(id: Index<InferSchemaInput<TSchema>, "_id">) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneQuery(
      this.schema,
      this.collection,
      this.readyPromise,
      this.relations,
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
  public findByIdAndUpdate(id: Index<InferSchemaInput<TSchema>, "_id">, update: UpdateFilter<TSchema> | Document[]) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneAndUpdateQuery(
      this.schema,
      this.collection,
      this.readyPromise,
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
  public findByIdAndDelete(id: Index<InferSchemaInput<TSchema>, "_id">) {
    const _idType = Schema.types(this.schema)._id;
    const isObjectIdType = MonarchType.isInstanceOf(_idType, MonarchObjectId);

    return new FindOneAndDeleteQuery(
      this.schema,
      this.collection,
      this.readyPromise,
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
  public findOne(filter: Filter<TSchema>) {
    return new FindOneQuery(this.schema, this.collection, this.readyPromise, this.relations, filter);
  }

  /**
   * Finds a document and replaces it with a new document.
   *
   * @param filter - Query filter
   * @param replacement - Replacement document
   * @returns FindOneAndReplaceQuery instance
   */
  public findOneAndReplace(filter: Filter<TSchema>, replacement: WithoutId<InferSchemaInput<TSchema>>) {
    return new FindOneAndReplaceQuery(this.schema, this.collection, this.readyPromise, filter, replacement);
  }

  /**
   * Finds a document and updates it.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns FindOneAndUpdateQuery instance
   */
  public findOneAndUpdate(filter: Filter<TSchema>, update: UpdateFilter<TSchema> | Document[]) {
    return new FindOneAndUpdateQuery(this.schema, this.collection, this.readyPromise, filter, update);
  }

  /**
   * Finds a document and deletes it.
   *
   * @param filter - Query filter
   * @returns FindOneAndDeleteQuery instance
   */
  public findOneAndDelete(filter: Filter<TSchema>) {
    return new FindOneAndDeleteQuery(this.schema, this.collection, this.readyPromise, filter);
  }

  /**
   * Inserts a single document into the collection.
   *
   * @param data - Document to insert
   * @returns InsertOneQuery instance
   */
  public insertOne(data: InferSchemaInput<TSchema>) {
    return new InsertOneQuery(this.schema, this.collection, this.readyPromise, data);
  }

  /**
   * Inserts multiple documents into the collection.
   *
   * @param data - Array of documents to insert
   * @returns InsertManyQuery instance
   */
  public insertMany(data: InferSchemaInput<TSchema>[]) {
    return new InsertManyQuery(this.schema, this.collection, this.readyPromise, data);
  }

  /**
   * Performs multiple write operations in bulk.
   *
   * @param data - Array of bulk write operations
   * @returns BulkWriteQuery instance
   */
  public bulkWrite(data: AnyBulkWriteOperation<InferSchemaData<TSchema>>[]) {
    return new BulkWriteQuery(this.schema, this.collection, this.readyPromise, data);
  }

  /**
   * Replaces a single document matching the filter.
   *
   * @param filter - Query filter
   * @param replacement - Replacement document
   * @returns ReplaceOneQuery instance
   */
  public replaceOne(filter: Filter<TSchema>, replacement: WithoutId<InferSchemaInput<TSchema>>) {
    return new ReplaceOneQuery(this.schema, this.collection, this.readyPromise, filter, replacement);
  }

  /**
   * Updates a single document matching the filter.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns UpdateOneQuery instance
   */
  public updateOne(filter: Filter<TSchema>, update: UpdateFilter<TSchema> | Document[]) {
    return new UpdateOneQuery(this.schema, this.collection, this.readyPromise, filter, update);
  }

  /**
   * Updates multiple documents matching the filter.
   *
   * @param filter - Query filter
   * @param update - Update operations
   * @returns UpdateManyQuery instance
   */
  public updateMany(filter: Filter<TSchema>, update: UpdateFilter<TSchema> | Document[]) {
    return new UpdateManyQuery(this.schema, this.collection, this.readyPromise, filter, update);
  }

  /**
   * Deletes a single document matching the filter.
   *
   * @param filter - Query filter
   * @returns DeleteOneQuery instance
   */
  public deleteOne(filter: Filter<TSchema>) {
    return new DeleteOneQuery(this.schema, this.collection, this.readyPromise, filter);
  }

  /**
   * Deletes multiple documents matching the filter.
   *
   * @param filter - Query filter
   * @returns DeleteManyQuery instance
   */
  public deleteMany(filter: Filter<TSchema>) {
    return new DeleteManyQuery(this.schema, this.collection, this.readyPromise, filter);
  }

  /**
   * Creates an aggregation pipeline for complex queries.
   *
   * @returns AggregationPipeline instance
   */
  public aggregate<TOutput extends any[]>() {
    return new AggregationPipeline<TSchema, TOutput[]>(this.schema, this.collection, this.readyPromise);
  }

  /**
   * Counts documents matching the filter.
   *
   * @param filter - Query filter
   * @param options - Count options
   * @returns Promise resolving to document count
   */
  public async countDocuments(filter: Filter<TSchema> = {}, options?: CountDocumentsOptions) {
    return await this.collection.countDocuments(filter as MongoFilter<InferSchemaData<TSchema>>, options);
  }

  /**
   * Estimates total document count in the collection.
   *
   * @param options - Estimation options
   * @returns Promise resolving to estimated count
   */
  public async estimatedDocumentCount(options?: EstimatedDocumentCountOptions) {
    return await this.collection.estimatedDocumentCount(options);
  }
}
