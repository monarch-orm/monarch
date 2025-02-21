import {
  type AnyBulkWriteOperation,
  type BulkWriteOptions,
  type ChangeStream,
  type ChangeStreamDocument,
  type ChangeStreamOptions,
  type CountDocumentsOptions,
  type CountOptions,
  type CreateIndexesOptions,
  type Db,
  type DistinctOptions,
  type Document,
  type DropCollectionOptions,
  type DropIndexesOptions,
  type EstimatedDocumentCountOptions,
  type Filter,
  type Flatten,
  type Hint,
  type IndexDescription,
  type IndexDescriptionCompact,
  type IndexDescriptionInfo,
  type IndexInformationOptions,
  type IndexSpecification,
  type ListIndexesOptions,
  type ListSearchIndexesCursor,
  type ListSearchIndexesOptions,
  type Collection as MongoCollection,
  ObjectId,
  type OperationOptions,
  type RenameOptions,
  type SearchIndexDescription,
  type UpdateFilter,
  type WithoutId,
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

type PropertiesOf<T, Overrides extends keyof T = never> = {
  [K in keyof T]: K extends Overrides ? any : T[K];
};
type CollectionProperties = PropertiesOf<
  MongoCollection,
  | "find"
  | "findOne"
  | "findOneAndReplace"
  | "findOneAndUpdate"
  | "findOneAndDelete"
  | "insertOne"
  | "insertMany"
  | "bulkWrite"
  | "replaceOne"
  | "updateOne"
  | "updateMany"
  | "deleteOne"
  | "deleteMany"
  | "count"
  | "countDocuments"
  | "estimatedDocumentCount"
  | "aggregate"
>;

export class Collection<
  TSchema extends AnySchema,
  TDbRelations extends Record<string, AnyRelations>,
> implements CollectionProperties
{
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

  public async count(
    filter: Filter<InferSchemaData<TSchema>> = {},
    options?: CountOptions,
  ) {
    return await this._collection.count(filter, options);
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

  public get dbName() {
    return this._collection.dbName;
  }

  public get collectionName() {
    return this._collection.collectionName;
  }

  public get namespace() {
    return this._collection.namespace;
  }

  public get readConcern() {
    return this._collection.readConcern;
  }

  public get readPreference() {
    return this._collection.readPreference;
  }

  public get bsonOptions() {
    return this._collection.bsonOptions;
  }

  public get writeConcern() {
    return this._collection.writeConcern;
  }

  public get hint() {
    return this._collection.hint;
  }

  public set hint(v: Hint | undefined) {
    this._collection.hint = v;
  }

  public get timeoutMS() {
    return this._collection.timeoutMS;
  }

  public options(options?: OperationOptions) {
    return this._collection.options(options);
  }

  public isCapped(options?: OperationOptions) {
    return this._collection.isCapped(options);
  }

  public createIndex(
    indexSpec: IndexSpecification,
    options?: CreateIndexesOptions,
  ) {
    return this._collection.createIndex(indexSpec, options);
  }

  public createIndexes(
    indexSpecs: IndexDescription[],
    options?: CreateIndexesOptions,
  ) {
    return this._collection.createIndexes(indexSpecs, options);
  }

  public dropIndex(indexName: string, options?: DropIndexesOptions) {
    return this._collection.dropIndex(indexName, options);
  }

  public dropIndexes(options?: DropIndexesOptions) {
    return this._collection.dropIndexes(options);
  }

  public listIndexes(options?: ListIndexesOptions) {
    return this._collection.listIndexes(options);
  }

  public async indexExists(
    indexes: string | string[],
    options?: ListIndexesOptions,
  ) {
    return this._collection.indexExists(indexes, options);
  }

  indexInformation(
    options: IndexInformationOptions & {
      full: true;
    },
  ): Promise<IndexDescriptionInfo[]>;
  indexInformation(
    options: IndexInformationOptions & {
      full?: false;
    },
  ): Promise<IndexDescriptionCompact>;
  indexInformation(
    options: IndexInformationOptions,
  ): Promise<IndexDescriptionCompact | IndexDescriptionInfo[]>;
  indexInformation(): Promise<IndexDescriptionCompact>;
  public async indexInformation(options?: any): Promise<any> {
    return this._collection.indexInformation(options);
  }

  distinct<Key extends keyof InferSchemaData<TSchema>>(
    key: Key,
  ): Promise<Array<Flatten<InferSchemaData<TSchema>[Key]>>>;
  distinct<Key extends keyof InferSchemaData<TSchema>>(
    key: Key,
    filter: Filter<InferSchemaData<TSchema>>,
  ): Promise<Array<Flatten<InferSchemaData<TSchema>[Key]>>>;
  distinct<Key extends keyof InferSchemaData<TSchema>>(
    key: Key,
    filter: Filter<InferSchemaData<TSchema>>,
    options: DistinctOptions,
  ): Promise<Array<Flatten<InferSchemaData<TSchema>[Key]>>>;
  distinct(key: string): Promise<any[]>;
  distinct(
    key: string,
    filter: Filter<InferSchemaData<TSchema>>,
  ): Promise<any[]>;
  distinct(
    key: string,
    filter: Filter<InferSchemaData<TSchema>>,
    options: DistinctOptions,
  ): Promise<any[]>;
  public async distinct(key: any, filter?: any, options?: any): Promise<any[]> {
    return this._collection.distinct(key, filter, options);
  }

  indexes(
    options: IndexInformationOptions & {
      full?: true;
    },
  ): Promise<IndexDescriptionInfo[]>;
  indexes(
    options: IndexInformationOptions & {
      full: false;
    },
  ): Promise<IndexDescriptionCompact>;
  indexes(
    options: IndexInformationOptions,
  ): Promise<IndexDescriptionCompact | IndexDescriptionInfo[]>;
  indexes(options?: ListIndexesOptions): Promise<IndexDescriptionInfo[]>;
  public async indexes(options?: any): Promise<any> {
    return this._collection.indexes(options);
  }

  public async rename(newName: string, options?: RenameOptions) {
    return this._collection.rename(newName, options);
  }

  public async drop(options?: DropCollectionOptions) {
    return this._collection.drop(options);
  }

  public aggregate() {
    return new AggregationPipeline(
      this.schema,
      this._collection,
      this._readyPromise,
    );
  }

  public watch<
    TLocal extends Document = InferSchemaData<TSchema>,
    TChange extends Document = ChangeStreamDocument<TLocal>,
  >(
    pipeline?: Document[],
    options?: ChangeStreamOptions,
  ): ChangeStream<TLocal, TChange> {
    return this._collection.watch(pipeline, options);
  }

  public initializeUnorderedBulkOp(options?: BulkWriteOptions) {
    return this._collection.initializeUnorderedBulkOp(options);
  }

  public initializeOrderedBulkOp(options?: BulkWriteOptions) {
    return this._collection.initializeOrderedBulkOp(options);
  }

  listSearchIndexes(
    options?: ListSearchIndexesOptions,
  ): ListSearchIndexesCursor;
  listSearchIndexes(
    name: string,
    options?: ListSearchIndexesOptions,
  ): ListSearchIndexesCursor;
  public listSearchIndexes(
    param1?: string | ListSearchIndexesOptions,
    param2?: ListSearchIndexesOptions,
  ): ListSearchIndexesCursor {
    if (typeof param1 === "string") {
      return this._collection.listSearchIndexes(param1, param2);
    }
    return this._collection.listSearchIndexes(param2);
  }

  public async createSearchIndex(description: SearchIndexDescription) {
    return this._collection.createSearchIndex(description);
  }

  public async createSearchIndexes(descriptions: SearchIndexDescription[]) {
    return this._collection.createSearchIndexes(descriptions);
  }

  public async dropSearchIndex(name: string) {
    return this._collection.dropSearchIndex(name);
  }

  public async updateSearchIndex(name: string, definition: Document) {
    return this._collection.updateSearchIndex(name, definition);
  }
}
