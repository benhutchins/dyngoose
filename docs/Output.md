# Query Output

All query methods in Dyngoose, other than `Table.primaryKey.get(…)` and `Table.gsiIndex.get(…)` will return an object that matches the `Dyngoose.QueryOutput` interface. 

See the [`src/query/output.ts`](https://github.com/benhutchins/dyngoose/blob/master/src/query/output.ts).

## `output[0]`

The output is a native JavaScript Array, allowing you to access the returned items directly on the output object. You can loop and interact with it as a native array:

```typescript
for (const document of output) {
  console.log(document.toJSON())
}
```

## `output.count`

The number of items in the response.

Since `output` is also a native JavaScript array, you can use also `output.length` except for when when performing a query with `Select` as `COUNT`, such as calling `.count()` on a [`MagicSearch`](MagicSearch.md) class. Then this will contain the number of documents matching your query.

## `output.scannedCount`

The number of items evaluated. A high `scannedCount` value with a low `count` value indicates an inefficient query operation. If you did not use a filter in the request, then ScannedCount is the same as Count.

For more information, see [Count and ScannedCount](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.Count) in the Amazon DynamoDB Developer Guide.

## `output.lastEvaluatedKey`

The primary key of the item where the operation stopped, inclusive of the previous result set. Use this value to start a new operation, excluding this value in the new request. If `lastEvaluatedKey` is empty, then the "last page" of results has been processed and there is no more data to be retrieved. If `lastEvaluatedKey` is not empty, it does not necessarily mean that there is more data in the result set. The only way to know when you have reached the end of the result set is when `lastEvaluatedKey` is empty.

## `output.consumedCapacity`

The capacity units consumed by the query operation. The data returned includes the total provisioned throughput consumed, along with statistics for the table and any indexes involved in the operation. `consumedCapacity` is only returned if requested.

For more information, see [Provisioned Throughput](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EMRforDynamoDB.PerformanceTuning.Throughput.html) in the Amazon DynamoDB Developer Guide.
