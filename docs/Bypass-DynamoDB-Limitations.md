Dyngoose bypasses some limits that are enforced by DynamoDB and the AWS-SDK.


1. BatchWrite operations has a limit of a maximum of 25 items per request.  
Dyngoose automatically splits delete and put write requests into chunks of 25 and sends requests and will perform the operations in parallel.
2. BatchGet has a limit of a maximum of 100 items per requests  
Dyngoose automatically splits requested keys into chunks of 100 and sends the requests in parallel.
3. BatchGet doesn't keep the order of items as it is in input keys.  
Dyngoose sorts the return items based on input keys to match the requested order.
4. TransactWriteItems operations has a limit of a maximum of 25 items per request.  
Dyngoose automatically splits put write requests into chunks of 25 and sends requests and will perform the operations in parallel.
