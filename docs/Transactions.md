# Transactions

Within DynamoDB there are primarily two kinds of batch operation methods, both of which Dyngoose exposes with utility classes.

It is important to understand the difference between these two types of operations. The transact methods are atomic, which means every request specified must complete successfully otherwise the entire operation is cancelled and no changes are saved. Whereas, with the batch methods, the individual requests are atomic meaning that the entire document will be updated, saved, or deleted successfully but specific items in the request may fail and only some of the changes will be committed.

## TransactWriteItems

DynamoDB supports atomic transactions via the [`TransactWriteItems`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html) operation. To expose this functionality within Dyngoose, there is the `Dyngoose.Transaction` class.

### Example

```typescript
const transaction = new Dyngoose.Transaction()

// using .save will intelligently perform a PutItem or UpdateItem as necessary
transaction.save(User.new(…))
transaction.save(User.new(…))
transaction.save(User.new(…), [conditions])

// you can also explicitly perform a put or save operation
transaction.put(User.new(…))
transaction.update(User.new(…))

// you can also add delete requests to your transaction
transaction.delete(user, [conditions])

// you can also delete an item by key, without loading it from Dyngoose first
transaction.delete(User.primaryKey.fromKey(…))

// you can also add conditional checks to your transaction
transaction.conditionCheck(user, { updatedAt: user.updatedAt })

// commit the transactions
await transaction.commit()
```

## BatchWriteItem

DynamoDB supports batch write operations which are not fully atomic via the [`BatchWriteItem`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html) method. To expose this functionality within Dyngoose, there is the `Dyngoose.BatchWrite` class.

### Example

```typescript
const batch = new Dyngoose.BatchWrite()

// save new items
batch.put(
  User.new(…),
  User.new(…),
  User.new(…),
)

// you can also add delete requests to your transaction
batch.delete(user)

// you can also delete an item by key, without loading it from Dyngoose first
batch.delete(User.primaryKey.fromKey(…))

// commit the batch write operation
await batch.commit()
```

## BatchGetItem

DynamoDB supports batch get operations via the [`BatchWriteItem`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html) method. This operation allows you to retrieve records from one or more tables. To expose this functionality within Dyngoose, there is the `Dyngoose.BatchGet` class.

### Example

```typescript
const batch = new Dyngoose.BatchGet()

const user = User.primaryKey.fromKey(…)
const product = Product.primaryKey.fromKey(…)
const order = Order.primaryKey.fromKey(…)

// save new items
batch.get(
  user,
  product,
  order,
)

// retrieve all the records
const items = await batch.retrieve()

// items is an array, which will be in order:
console.log(items[0] instanceof User) // true
console.log(items[1] instanceof Product) // true
console.log(items[1] instanceof Order) // true

// the batch get operation also mutates the original object
console.log(user.toJSON()) // will contain data
```
