# Stuff to do

## Introduction

## Features
Here are some features we need to implement.

### Schema methods

- [] unique
- [] uuid and id generation
- [] timestamps
- [] casade
- [] events like on save, on create and more
- [] migrate and rollback
- [] Track changes

### Database Methods

- [] events like on save, on create and more

### API Improvements

- [] Add batch operations helper methods

### Missing Features

- [] Transaction support - wrapper for MongoDB transactions
- [] Schema validation sync - sync Monarch schema to MongoDB validators
- [] Migration support - utilities for schema changes
- [] Repository pattern abstraction
- [] Complete proper schema types
- [] Implement where and query for populations

### Documentation Improvements

- [] Document population mechanism in detail
- [] Document error handling patterns
- [] Add examples for complex type scenarios

### Test Coverage Gaps

- [] Add tests for concurrent operations
- [] Add tests for memory usage with large datasets
- [] Add tests for index creation failures

### Bugs list

- [] Where query argument takes anything even though the intellisense is correct
- [] Insert is not a query and does not return the model.
- [] optional() does not have any effect on the types
- [] $addToSet is not working
- [] findOneAndUpdate does not validate data
