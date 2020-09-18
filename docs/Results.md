# Results

All query methods in Dyngoose, other than `Table.primaryKey.get(…)` will return an object that matches the `Dyngoose.Results` interface. 

See the [`src/query/results.ts`](https://github.com/benhutchins/dyngoose/blob/master/src/query/results.ts).

## `results.records`

These are the records returned from DynamoDB converted into instances of your `Table` class.

## `results.count`

The number of items in the response.

When performing a query with `Select` as `COUNT`, such as calling `.count()` on a [`MagicSearch`](MagicSearch.md) class, this will contain the count you requested.

## `results.scannedCount`

The number of items evaluated. A high `scannedCount` value with a low `count` value indicates an inefficient query operation. If you did not use a filter in the request, then ScannedCount is the same as Count.

For more information, see [Count and ScannedCount](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.Count) in the Amazon DynamoDB Developer Guide.

## `results.lastEvaluatedKey`

The primary key of the item where the operation stopped, inclusive of the previous result set. Use this value to start a new operation, excluding this value in the new request. If `lastEvaluatedKey` is empty, then the "last page" of results has been processed and there is no more data to be retrieved. If `lastEvaluatedKey` is not empty, it does not necessarily mean that there is more data in the result set. The only way to know when you have reached the end of the result set is when `lastEvaluatedKey` is empty.

## `results.consumedCapacity`

The capacity units consumed by the query operation. The data returned includes the total provisioned throughput consumed, along with statistics for the table and any indexes involved in the operation. `consumedCapacity` is only returned if requested.

For more information, see [Provisioned Throughput](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EMRforDynamoDB.PerformanceTuning.Throughput.html) in the Amazon DynamoDB Developer Guide.
