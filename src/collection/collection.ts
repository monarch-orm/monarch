import {
  type AnyBulkWriteOperation,
  type CountDocumentsOptions,
  type Db,
  type EstimatedDocumentCountOptions,
  type Filter,
  type Collection as MongoCollection,
  ObjectId,
  type UpdateFilter,
  type WithoutId
} from "mongodb";
import { MonarchError } from "../errors";
import type { AnyRelations } from "../relations/relations";
import { makeIndexes } from "../schema/indexes";
import { type AnySchema, Schema } from "../schema/schema";
import type {
  InferSchemaData,
  InferSchemaInput,
  SchemaInputWithId,
} from "../schema/type-helpers";
import { MonarchObjectId } from "../types/objectId";
import { MonarchType } from "../types/type";
import type { Index } from "../utils/type-helpers";
import { AggregationPipeline } from "./pipeline/aggregation";
import { BulkWriteQuery } from "./query/bulk-write";
import { DeleteManyQuery } from "./query/delete-many";
import { DeleteOneQuery } from "./query/delete-one";
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

export class Collection<
  TSchema extends AnySchema,
  TDbRelations extends Record<string, AnyRelations>,
> {
  private _collection: MongoCollection<InferSchemaData<TSchema>>;
  private _readyPromise: Promise<void>;

  constructor(
    db: Db,
    public schema: TSchema,
    public relations: TDbRelations,
  ) {
    // create indexes
    if (schema.options.indexes) {
      const indexes = makeIndexes(schema.options.indexes);
      const indexesPromises = Object.entries(indexes).map(
        async ([key, [fields, options]]) => {
          await db.createIndex(schema.name, fields, options).catch((error) => {
            throw new MonarchError(`failed to create index '${key}': ${error}`);
          });
        },
      );
      this._readyPromise = Promise.all(indexesPromises).then(() => undefined);
    } else {
      this._readyPromise = Promise.resolve();
    }
    this._collection = db.collection<InferSchemaData<TSchema>>(
      this.schema.name,
    );
  }

  public get isReady() {
    return this._readyPromise;
  }

  public raw() {
    return this._collection;
  }

  public find(filter: Filter<InferSchemaData<TSchema>> = {}) {
    return new FindQuery(
      this.schema,
      this.relations,
      this._collection,
      this._readyPromise,
      filter,
    );
  }

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

  public findOne(filter: Filter<InferSchemaData<TSchema>>) {
    return new FindOneQuery(
      this.schema,
      this.relations,
      this._collection,
      this._readyPromise,
      filter,
    );
  }

  public findOneAndReplace(
    filter: Filter<InferSchemaData<TSchema>>,
    replacement: WithoutId<InferSchemaData<TSchema>>,
  ) {
    return new FindOneAndReplaceQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
      replacement,
    );
  }

  public findOneAndUpdate(
    filter: Filter<InferSchemaData<TSchema>>,
    update: UpdateFilter<InferSchemaData<TSchema>>,
  ) {
    return new FindOneAndUpdateQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
      update,
    );
  }

  public findOneAndDelete(filter: Filter<InferSchemaData<TSchema>>) {
    return new FindOneAndDeleteQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
    );
  }

  public insertOne(data: InferSchemaInput<TSchema>) {
    return new InsertOneQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      data,
    );
  }

  public insertMany(data: InferSchemaInput<TSchema>[]) {
    return new InsertManyQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      data,
    );
  }

  public bulkWrite(data: AnyBulkWriteOperation<InferSchemaData<TSchema>>[]) {
    return new BulkWriteQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      data,
    );
  }

  public replaceOne(
    filter: Filter<InferSchemaData<TSchema>>,
    replacement: WithoutId<InferSchemaData<TSchema>>,
  ) {
    return new ReplaceOneQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
      replacement,
    );
  }

  public updateOne(
    filter: Filter<InferSchemaData<TSchema>>,
    update: UpdateFilter<InferSchemaData<TSchema>>,
  ) {
    return new UpdateOneQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
      update,
    );
  }

  public updateMany(
    filter: Filter<InferSchemaData<TSchema>>,
    update: UpdateFilter<InferSchemaData<TSchema>>,
  ) {
    return new UpdateManyQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
      update,
    );
  }

  public deleteOne(filter: Filter<InferSchemaData<TSchema>>) {
    return new DeleteOneQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
    );
  }

  public deleteMany(filter: Filter<InferSchemaData<TSchema>>) {
    return new DeleteManyQuery(
      this.schema,
      this._collection,
      this._readyPromise,
      filter,
    );
  }

  public aggregate() {
    return new AggregationPipeline<TSchema, any[]>(
      this.schema,
      this._collection,
      this._readyPromise,
    );
  }

  public async countDocuments(
    filter: Filter<InferSchemaData<TSchema>> = {},
    options?: CountDocumentsOptions,
  ) {
    return await this._collection.countDocuments(filter, options);
  }

  public async estimatedDocumentCount(options?: EstimatedDocumentCountOptions) {
    return await this._collection.estimatedDocumentCount(options);
  }
}
