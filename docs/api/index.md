# API Documentation

This page provides a comprehensive list of all collection methods available in Monarch ORM.

## Collection Operations

### `insert()`
Inserts a new document into the collection.
- **Return Type:** `Promise<InsertOneWriteOpResult<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the insert operation.

### `insertOne()`
Inserts a single document into the collection.
- **Return Type:** `Promise<InsertOneWriteOpResult<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the insert operation.

### `insertMany()`
Inserts multiple documents into the collection.
- **Return Type:** `Promise<InsertWriteOpResult<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the insert operation.

### `find()`
Retrieves documents from the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<InferSchemaData<T>[]>`
- **Callable Methods:**
  - `where()`: Filters the documents based on a specified condition.
  - `exec()`: Executes the find operation.
  - `limit()`: Limits the number of documents returned.
  - `skip()`: Skips a specified number of documents.
  - `sort()`: Sorts the documents by a specified field.

### `findOne()`
Retrieves a single document from the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<InferSchemaData<T> | null>`
- **Callable Methods:**
  - `where()`: Filters the documents based on a specified condition.
  - `exec()`: Executes the find operation.

### `findOneAndDelete()`
Retrieves a single document from the collection and deletes it.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<FindAndModifyWriteOpResultObject<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the find and delete operation.

### `findOneAndUpdate()`
Retrieves a single document from the collection, updates it, and returns the updated document.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
  - `update`: `UpdateFilter<InferSchemaData<T>>`
- **Return Type:** `Promise<FindAndModifyWriteOpResultObject<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the find and update operation.

### `findOneAndReplace()`
Retrieves a single document from the collection, replaces it, and returns the new document.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
  - `replacement`: `InferSchemaData<T>`
- **Return Type:** `Promise<FindAndModifyWriteOpResultObject<InferSchemaData<T>>>`
- **Callable Methods:**
  - `exec()`: Executes the find and replace operation.

### `count()`
Counts the number of documents in the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<number>`
- **Callable Methods:**
  - `exec()`: Executes the count operation.

### `updateOne()`
Updates a single document in the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
  - `update`: `UpdateFilter<InferSchemaData<T>>`
- **Return Type:** `Promise<UpdateWriteOpResult>`
- **Callable Methods:**
  - `exec()`: Executes the update operation.

### `updateMany()`
Updates multiple documents in the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
  - `update`: `UpdateFilter<InferSchemaData<T>>`
- **Return Type:** `Promise<UpdateWriteOpResult>`
- **Callable Methods:**
  - `exec()`: Executes the update operation.

### `deleteOne()`
Deletes a single document from the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<DeleteWriteOpResultObject>`
- **Callable Methods:**
  - `exec()`: Executes the delete operation.

### `deleteMany()`
Deletes multiple documents from the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<DeleteWriteOpResultObject>`
- **Callable Methods:**
  - `exec()`: Executes the delete operation.

### `replaceOne()`
Replaces a single document in the collection.
- **Arguments:**
  - `filter`: `Filter<InferSchemaData<T>>`
  - `replacement`: `InferSchemaData<T>`
- **Return Type:** `Promise<ReplaceWriteOpResult>`
- **Callable Methods:**
  - `exec()`: Executes the replace operation.

### `aggregate()`
Performs aggregation operations on the collection.
- **Arguments:**
  - `pipeline`: `PipelineStage<OptionalUnlessRequiredId<InferSchemaData<T>>>[]`
- **Return Type:** `AggregationCursor<InferSchemaData<T>>`
- **Callable Methods:**
  - `exec()`: Executes the aggregation operation.
  - `allowDiskUse()`: Allows the aggregation operation to use disk storage.
  - `cursor()`: Returns a cursor for the aggregation operation.

### `watch()`
Watches for changes in the collection.
- **Arguments:**
  - `pipeline`: `PipelineStage<any>[]`
- **Return Type:** `ChangeStream<InferSchemaData<T>>`
- **Callable Methods:**
  - `exec()`: Executes the watch operation.
  - `on()`: Attaches a listener to the change stream.

### `bulkWrite()`
Performs bulk write operations on the collection.
- **Return Type:** `Promise<BulkWriteOpResultObject>`
- **Callable Methods:**
  - `exec()`: Executes the bulk write operation.

### `distinct()`
Finds the distinct values for a specified field in the collection.
- **Arguments:**
  - `field`: `keyof InferSchemaOutput<T>`
  - `filter`: `Filter<InferSchemaData<T>>`
- **Return Type:** `Promise<InferSchemaOutput<T>[]>`
- **Callable Methods:**
  - `exec()`: Executes the distinct operation.

### `drop()`
Drops the collection.
- **Return Type:** `Promise<void>`
- **Callable Methods:**
  - `exec()`: Executes the drop operation.

### `estimatedDocumentCount()`
Estimates the number of documents in the collection.
- **Arguments:**
  - `options`: `EstimatedDocumentCountOptions`
- **Return Type:** `Promise<number>`
- **Callable Methods:**
  - `exec()`: Executes the estimated document count operation.

### `isCapped()`
Checks if the collection is capped.
- **Return Type:** `Promise<boolean>`
- **Callable Methods:**
  - `exec()`: Executes the is capped operation.

### `options()`
Gets the options of the collection.
- **Arguments:**
  - `options`: `OperationOptions`
- **Return Type:** `Promise<any>`
- **Callable Methods:**
  - `exec()`: Executes the options operation.

### `rename()`
Renames the collection.
- **Arguments:**
  - `newName`: `string`
  - `options`: `RenameOptions`
- **Return Type:** `Promise<MongoClient>`
- **Callable Methods:**
  - `exec()`: Executes the rename operation.

### `raw()`
Returns the raw MongoDB collection.
- **Return Type:** `MongoDBCollection<InferSchemaData<T>>`
- **Callable Methods:**
  - Various MongoDB collection methods.

## Index Operations

### `createIndex()`
Creates an index on the collection.
- **Arguments:**
  - `key`: `IndexDefinitionKey<Partial<InferSchemaData<T>>>`
  - `options`: `IndexDefinitionOptions<InferSchemaData<T>>`
- **Return Type:** `Promise<string>`
- **Callable Methods:**
  - `exec()`: Executes the create index operation.

### `createIndexes()`
Creates multiple indexes on the collection.
- **Arguments:**
  - `keys`: `IndexDefinitionKey<Partial<InferSchemaData<T>>>[]`
  - `options`: `IndexDefinitionOptions<InferSchemaData<T>>`
- **Return Type:** `Promise<string[]>`
- **Callable Methods:**
  - `exec()`: Executes the create indexes operation.

### `dropIndex()`
Drops an index from the collection.
- **Arguments:**
  - `value`: `string`
- **Return Type:** `Promise<string>`
- **Callable Methods:**
  - `exec()`: Executes the drop index operation.

### `dropIndexes()`
Drops all indexes from the collection.
- **Arguments:**
  - `options`: `DropIndexesOptions`
- **Return Type:** `Promise<string[]>`
- **Callable Methods:**
  - `exec()`: Executes the drop indexes operation.

### `listIndexes()`
Lists all indexes on the collection.
- **Return Type:** `CommandCursor<IndexInformation[]>`
- **Callable Methods:**
  - `exec()`: Executes the list indexes operation.
  - `forEach()`: Iterates over the index information.

### `indexExists()`
Checks if an index exists on the collection.
- **Arguments:**
  - `name`: `string`
  - `options`: `AbstractCursorOptions`
- **Return Type:** `Promise<boolean>`
- **Callable Methods:**
  - `exec()`: Executes the index exists operation.

### `indexInformation()`
Gets information about the indexes on the collection.
- **Arguments:**
  - `options`: `IndexInformationOptions & { full?: boolean; }`
- **Return Type:** `Promise<IndexInformation[]>`
- **Callable Methods:**
  - `exec()`: Executes the index information operation.
  - `forEach()`: Iterates over the index information.

## Search Index Operations

### `createSearchIndex()`
Creates a search index on the collection.
- **Arguments:**
  - `description`: `SearchIndexDescription`
- **Return Type:** `Promise<string>`
- **Callable Methods:**
  - `exec()`: Executes the create search index operation.

### `createSearchIndexes()`
Creates multiple search indexes on the collection.
- **Arguments:**
  - `descriptions`: `SearchIndexDescription[]`
- **Return Type:** `Promise<string[]>`
- **Callable Methods:**
  - `exec()`: Executes the create search indexes operation.

### `dropSearchIndex()`
Drops a search index from the collection.
- **Arguments:**
  - `name`: `string`
- **Return Type:** `Promise<string>`
- **Callable Methods:**
  - `exec()`: Executes the drop search index operation.

### `listSearchIndexes()`
Lists all search indexes on the collection.
- **Return Type:** `CommandCursor<SearchIndexInformation[]>`
- **Callable Methods:**
  - `exec()`: Executes the list search indexes operation.
  - `forEach()`: Iterates over the search index information.

### `updateSearchIndex()`
Updates a search index on the collection.
- **Arguments:**
  - `name`: `string`
  - `description`: `SearchIndexDescription`
- **Return Type:** `Promise<string>`
- **Callable Methods:**
  - `exec()`: Executes the update search index operation.
