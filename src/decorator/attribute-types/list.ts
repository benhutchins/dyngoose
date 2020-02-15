// list: {
//   name: 'list',
//   dynamo: 'L',
//   isSet: true,
//   dynamofy: JSON.stringify,
//   dedynamofy: function listify(v: any, attr: Attribute) {
//     if (!v) {
//       return
//     }

//     const list = []
//     // debug('parsing list')

//     if (_.isArray(v)) {
//       for (let i = 0; i < v.length; i++) {
//         // TODO assume only one attribute type allowed for a list
//         const attrType = attr.attributes.get(0)

//         if (attrType) {
//           const attrVal = attrType.parseDynamo(v[i])
//           if (!_.isNil(attrVal)) {
//             list.push(attrVal)
//           }
//         }
//       }
//     }

//     return list
//   },
// },
