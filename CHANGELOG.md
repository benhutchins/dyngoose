# [3.0.0](https://github.com/benhutchins/dyngoose/compare/v2.16.5...v3.0.0) (2021-08-21)


### Bug Fixes

* additional testing to prevent [null] output [#482](https://github.com/benhutchins/dyngoose/issues/482) ([59f0541](https://github.com/benhutchins/dyngoose/commit/59f0541f5fcacfce46fc559fbabafc5215dcea10))
* querying by property names does not work as expected ([12e4d5d](https://github.com/benhutchins/dyngoose/commit/12e4d5dcc89ecec3f5ff56d742a0584209264edf)), closes [#494](https://github.com/benhutchins/dyngoose/issues/494)


### Features

* rework Table.save ([5ae4832](https://github.com/benhutchins/dyngoose/commit/5ae4832c2fc08a7e929bc6058a75f7a7bf37a604)), closes [#503](https://github.com/benhutchins/dyngoose/issues/503)
* update operators ([1fa1133](https://github.com/benhutchins/dyngoose/commit/1fa1133c8fc10d931ec2187bb41d7234c530bbb8))


### BREAKING CHANGES

* This has changed the way the `Table.save` method
accepts arguments. It now accepts an object of parameters, rather than
two hard-coded arguments. In addition, I've removed the
`Table.forceSave` method, that functionality is now integrated into the
`Table.save` method and is available by passing `{ force: true }` in the
parameters object.

## [2.16.5](https://github.com/benhutchins/dyngoose/compare/v2.16.4...v2.16.5) (2021-05-25)


### Bug Fixes

* the order of arguments for beforeSave [#479](https://github.com/benhutchins/dyngoose/issues/479) ([821fcb5](https://github.com/benhutchins/dyngoose/commit/821fcb50a161c4409421663609ad8b767a9f58e8))
* use of MagicSearch without filters for paging entire table/index ([9ba0309](https://github.com/benhutchins/dyngoose/commit/9ba03096d48be752faf771a73685ad17e14e5327)), closes [#478](https://github.com/benhutchins/dyngoose/issues/478)

## [2.16.4](https://github.com/benhutchins/dyngoose/compare/v2.16.3...v2.16.4) (2021-03-18)


### Bug Fixes

* apply defaults before importing values when using Table.fromJSON ([2d92a76](https://github.com/benhutchins/dyngoose/commit/2d92a76314608ad01bccfcd65326e07f20bf9a87))

## [2.16.3](https://github.com/benhutchins/dyngoose/compare/v2.16.2...v2.16.3) (2021-03-03)


### Bug Fixes

* excludes operator incorrectly formatting the query ([7e37678](https://github.com/benhutchins/dyngoose/commit/7e3767863706ca2457379bcb75948db2951f7ffe))

## [2.16.2](https://github.com/benhutchins/dyngoose/compare/v2.16.1...v2.16.2) (2021-03-01)


### Bug Fixes

* date attributes should accept number timestamps ([75a88e6](https://github.com/benhutchins/dyngoose/commit/75a88e6af5163745a934c22151668ca56041b761))

## [2.16.1](https://github.com/benhutchins/dyngoose/compare/v2.16.0...v2.16.1) (2021-03-01)


### Bug Fixes

* allow manipulateRead to be used even when the value is null ([f2f2935](https://github.com/benhutchins/dyngoose/commit/f2f29359b32fafca1387b6a2ab252b9742ed908b))
* allow manipulateWrite to be used when the value is null ([a204fcd](https://github.com/benhutchins/dyngoose/commit/a204fcd5148810c91a290a8c8072eb766b7c82bf))

# [2.16.0](https://github.com/benhutchins/dyngoose/compare/v2.15.3...v2.16.0) (2021-02-26)


### Features

* accept ISO formatted strings for Date attributes ([843396a](https://github.com/benhutchins/dyngoose/commit/843396a8a5c5bbceec99446f9c7ee6051ee68b90))
* add better typing for MagicSearch conditions ([27f01c9](https://github.com/benhutchins/dyngoose/commit/27f01c98920e0f625478d1beaba94850dfe556b0))

## [2.15.3](https://github.com/benhutchins/dyngoose/compare/v2.15.2...v2.15.3) (2021-02-23)


### Bug Fixes

* 🐛 Billing mode pay per request for GSIs ([#453](https://github.com/benhutchins/dyngoose/issues/453)) ([7bce6be](https://github.com/benhutchins/dyngoose/commit/7bce6be561453b49cb13a2eeaf0c0f3a38e37fd4))
* cannot specify BillingMode on the GSI input ([148d041](https://github.com/benhutchins/dyngoose/commit/148d04178e07a43c7d8e5c2b448067b3f556f146))

## [2.15.2](https://github.com/benhutchins/dyngoose/compare/v2.15.1...v2.15.2) (2021-02-22)


### Bug Fixes

* do not specify ProjectionExpression when performing a COUNT ([634f9e1](https://github.com/benhutchins/dyngoose/commit/634f9e1efd5d0ba1a94d5fc9e80f412796897e72))

## [2.15.1](https://github.com/benhutchins/dyngoose/compare/v2.15.0...v2.15.1) (2021-02-22)


### Bug Fixes

* projection expression for MagicSearch ([aa09be3](https://github.com/benhutchins/dyngoose/commit/aa09be36ad5e17b431f20cca8620aeb89adbbe7b))

# [2.15.0](https://github.com/benhutchins/dyngoose/compare/v2.14.0...v2.15.0) (2021-02-22)


### Features

* throw helpful errors when using MagicSearch and Batch utilities ([6ffb945](https://github.com/benhutchins/dyngoose/commit/6ffb9456e883bb3399469717351023cd5fa9f2db))

# [2.14.0](https://github.com/benhutchins/dyngoose/compare/v2.13.4...v2.14.0) (2021-02-19)


### Features

* support specifying the CloudFormation resource name for a Table ([7f2598b](https://github.com/benhutchins/dyngoose/commit/7f2598bc1853361ec47bebab8013ec3e9231bce5))

## [2.13.4](https://github.com/benhutchins/dyngoose/compare/v2.13.3...v2.13.4) (2021-02-05)


### Bug Fixes

* utility to expose whether a record is new ([0ec99e2](https://github.com/benhutchins/dyngoose/commit/0ec99e29b3571e0bcc17b70c1a9e5c1a983d92e0))

## [2.13.3](https://github.com/benhutchins/dyngoose/compare/v2.13.2...v2.13.3) (2021-02-05)


### Bug Fixes

* expose transaction CancellationReasons on the error ([92c73cd](https://github.com/benhutchins/dyngoose/commit/92c73cdd537d8364f572bdc15e5954c5986501f5))

## [2.13.2](https://github.com/benhutchins/dyngoose/compare/v2.13.1...v2.13.2) (2021-02-04)


### Bug Fixes

* using Table.fromJSON() with a Map attribute ([1cce51b](https://github.com/benhutchins/dyngoose/commit/1cce51bae09f4ba617d4ff46015a9a6ae49102cc))

## [2.13.1](https://github.com/benhutchins/dyngoose/compare/v2.13.0...v2.13.1) (2021-02-04)


### Bug Fixes

* using Table.toJSON() with a Map attribute ([9feef8e](https://github.com/benhutchins/dyngoose/commit/9feef8e4d260da2c2c78d0a3e317c4d3d55ea9ce))

# [2.13.0](https://github.com/benhutchins/dyngoose/compare/v2.12.3...v2.13.0) (2021-01-23)


### Features

* support enabling point-in-time recovery ([0462f52](https://github.com/benhutchins/dyngoose/commit/0462f521befd8970b35cce645c1e50998209cab7))

## [2.12.3](https://github.com/benhutchins/dyngoose/compare/v2.12.2...v2.12.3) (2021-01-22)


### Bug Fixes

* remove isTrulyEmpty's reliance on lodash's identity ([d227771](https://github.com/benhutchins/dyngoose/commit/d22777167c5fb43e6168a631b36c0c0e33486924)), closes [#445](https://github.com/benhutchins/dyngoose/issues/445)

## [2.12.2](https://github.com/benhutchins/dyngoose/compare/v2.12.1...v2.12.2) (2021-01-21)


### Bug Fixes

* support for typescript 4.1.x ([74a8b83](https://github.com/benhutchins/dyngoose/commit/74a8b834b5958616f219199d173cabded8212fac))

## [2.12.1](https://github.com/benhutchins/dyngoose/compare/v2.12.0...v2.12.1) (2021-01-21)


### Bug Fixes

* provide the query input to the PrimaryKey put and update handlers ([14cb4e3](https://github.com/benhutchins/dyngoose/commit/14cb4e3603c6e999f9c5693a702135bafc2105de))

# [2.12.0](https://github.com/benhutchins/dyngoose/compare/v2.11.1...v2.12.0) (2021-01-16)


### Features

* throw helpful errors with useful stacks ([b7c5f05](https://github.com/benhutchins/dyngoose/commit/b7c5f057b21762476362810b72657bf094cb080f))

## [2.11.1](https://github.com/benhutchins/dyngoose/compare/v2.11.0...v2.11.1) (2020-12-15)


### Bug Fixes

* pass the lastEvaluatedKey from the last output object during merge ([c15be05](https://github.com/benhutchins/dyngoose/commit/c15be059e26c1db2376bc2b5d7c4e52b0554d963))

# [2.11.0](https://github.com/benhutchins/dyngoose/compare/v2.10.1...v2.11.0) (2020-12-10)


### Features

* add Query.PrimaryKey.search ([595847e](https://github.com/benhutchins/dyngoose/commit/595847ef5547c006cc19cc01e3c95bd34761d546))

## [2.10.1](https://github.com/benhutchins/dyngoose/compare/v2.10.0...v2.10.1) (2020-12-05)


### Bug Fixes

* usage of fromDynamo was not consistent ([88b23b2](https://github.com/benhutchins/dyngoose/commit/88b23b22d7ff6a2537885975f44cb1e86f38fe2b))

# [2.10.0](https://github.com/benhutchins/dyngoose/compare/v2.9.2...v2.10.0) (2020-12-05)


### Bug Fixes

* allow deleting of attributes when loaded from primaryKey.fromKey ([5568d6c](https://github.com/benhutchins/dyngoose/commit/5568d6c3d37c9924d85b5369899909ec6d9297d6))


### Features

* allow filtering on scans of the primary key ([f753097](https://github.com/benhutchins/dyngoose/commit/f7530973bf117460819c0004f9ad0c6bb6a47341))

## [2.9.2](https://github.com/benhutchins/dyngoose/compare/v2.9.1...v2.9.2) (2020-11-27)


### Bug Fixes

* using MagicSearch with indexes was not building KeyConditions ([95ae96d](https://github.com/benhutchins/dyngoose/commit/95ae96de2ec7f7cb6ab3e69ccc1b140490403b57))

## [2.9.1](https://github.com/benhutchins/dyngoose/compare/v2.9.0...v2.9.1) (2020-11-14)


### Bug Fixes

* fix using dates as range key and calling primarKey.get ([5284298](https://github.com/benhutchins/dyngoose/commit/5284298271ba33df19a793cd46f11baf5e2459d5))

# [2.9.0](https://github.com/benhutchins/dyngoose/compare/v2.8.1...v2.9.0) (2020-11-14)


### Bug Fixes

* require the table name to be specified ([5651e1b](https://github.com/benhutchins/dyngoose/commit/5651e1bcea72fe9ed2bc4cdf671fc43360763911))


### Features

* allow strict property name pathing into maps ([9078ccb](https://github.com/benhutchins/dyngoose/commit/9078ccb4b73b8def1002dbed605443e800dc79f1))
* atomic batch get operations ([590f268](https://github.com/benhutchins/dyngoose/commit/590f2682777467f62be95d1ae27736f98e400dc5))
* primary key .get method accepts filters object ([d08618c](https://github.com/benhutchins/dyngoose/commit/d08618c5a7e0a99bbb3326a81d639bb0b6981c88))
* semaphore batch writes ([ab42567](https://github.com/benhutchins/dyngoose/commit/ab425679ffca620db7a3969361e6075b211d5cfc))
* use projection expression builder for MagicSearch ([132ca9b](https://github.com/benhutchins/dyngoose/commit/132ca9b4f09d723152e15b134e0ed3eb8a547152))

## [2.8.1](https://github.com/benhutchins/dyngoose/compare/v2.8.0...v2.8.1) (2020-11-14)


### Bug Fixes

* do not apply defaults when loading from DynamoDB ([adac797](https://github.com/benhutchins/dyngoose/commit/adac797a7250e348d7886365a476fe5bab7139b5))

# [2.8.0](https://github.com/benhutchins/dyngoose/compare/v2.7.1...v2.8.0) (2020-11-14)


### Features

* remove items not found from batch results ([ed698df](https://github.com/benhutchins/dyngoose/commit/ed698df0d8ced16808238d339225e543bc38dd41))
* support deep maps ([042bde9](https://github.com/benhutchins/dyngoose/commit/042bde9dfbf5123ba16263644f7e2c7ba6da7b02))

## [2.7.1](https://github.com/benhutchins/dyngoose/compare/v2.7.0...v2.7.1) (2020-11-04)


### Bug Fixes

* projections were failing when no reserved words were used ([20cbe7b](https://github.com/benhutchins/dyngoose/commit/20cbe7b0576decb59fbe50e1ee05c6672ab6ad28))

# [2.7.0](https://github.com/benhutchins/dyngoose/compare/v2.6.0...v2.7.0) (2020-11-03)


### Features

* build projection expressions to support reserved word attributes ([c005758](https://github.com/benhutchins/dyngoose/commit/c005758f2c2bf47942e4df2fc7aad4feaccc194e))

# [2.6.0](https://github.com/benhutchins/dyngoose/compare/v2.5.0...v2.6.0) (2020-11-03)


### Features

* add batch get utility class ([75fa6c9](https://github.com/benhutchins/dyngoose/commit/75fa6c96184cfeb2e3eabcdf4164abfa84dfd738))

# [2.5.0](https://github.com/benhutchins/dyngoose/compare/v2.4.0...v2.5.0) (2020-10-29)


### Features

* add .minimum(min) execution utility to MagicSearch ([fa987a4](https://github.com/benhutchins/dyngoose/commit/fa987a44c5963d8942e3fc7a2511e4baa48548e0))

# [2.4.0](https://github.com/benhutchins/dyngoose/compare/v2.3.2...v2.4.0) (2020-10-29)


### Features

* allow throughput to be specified as a number on GSIs ([e5cbbae](https://github.com/benhutchins/dyngoose/commit/e5cbbaee46915fbf1b95cd8e06d9f4b47f3ce8eb))
* check the nonKeyAttributes specified to a GSI ([8d0962e](https://github.com/benhutchins/dyngoose/commit/8d0962e896f7d6dfe67c480237abb7ffabad57bb))
* include the src files, which are referenced by the js maps ([11e3f77](https://github.com/benhutchins/dyngoose/commit/11e3f779d91e0bf643fd245e629c3aa930d668f9))
* query output as an native array ([ac8111c](https://github.com/benhutchins/dyngoose/commit/ac8111c1d41f5dff55460abe30f6a2584f06d2f9))
* set limit of 1 when performing a gsi.get query ([a519758](https://github.com/benhutchins/dyngoose/commit/a519758a61fc3d24490c5892bd63014c97dfaeed))

## [2.3.2](https://github.com/benhutchins/dyngoose/compare/v2.3.1...v2.3.2) (2020-10-23)


### Bug Fixes

* allow void to be used as the range key type for primary keys ([2a181bc](https://github.com/benhutchins/dyngoose/commit/2a181bcb9d1e9701a807df5e4967910489058ba4))

## [2.3.1](https://github.com/benhutchins/dyngoose/compare/v2.3.0...v2.3.1) (2020-10-23)


### Bug Fixes

* allow any property name, but maintain the intelligent autocomplete ([fd31498](https://github.com/benhutchins/dyngoose/commit/fd31498f2977c35ddcaf61b8baf8063fe523435e))

# [2.3.0](https://github.com/benhutchins/dyngoose/compare/v2.2.0...v2.3.0) (2020-10-22)


### Bug Fixes

* any attribute using binary's metadata ([8c4d077](https://github.com/benhutchins/dyngoose/commit/8c4d0774428bb64a56c8d25ac95e04a4e7e3e3e9))
* ensure specs are excluded from npm package ([37252b7](https://github.com/benhutchins/dyngoose/commit/37252b770ed52d7bc426426588632da681fade65))
* npm run test command referencing removing tsconfig ([d85d898](https://github.com/benhutchins/dyngoose/commit/d85d8986a64251dcfbffc0e4f5b9f5f7e292de4d))


### Features

* add del to table to delete by property name ([c9a0647](https://github.com/benhutchins/dyngoose/commit/c9a06471885746a30cb2f50b34813ef59a116733))
* upgrade to eslint, add bigint support to NS, type set/get on table ([9aec8c3](https://github.com/benhutchins/dyngoose/commit/9aec8c3d1ca3dbc1616d4501abd76641fdc938b2))

# [2.2.0](https://github.com/benhutchins/dyngoose/compare/v2.1.0...v2.2.0) (2020-10-14)


### Features

* remove moment in favor of using native Date functions ([#292](https://github.com/benhutchins/dyngoose/issues/292)) ([4cc0807](https://github.com/benhutchins/dyngoose/commit/4cc08077d5c605b2b8205089e8e9f26661eaf6e9))

# [2.1.0](https://github.com/benhutchins/dyngoose/compare/v2.0.0...v2.1.0) (2020-10-14)


### Features

* 🐛 Added transact write to dynamoClient ([#290](https://github.com/benhutchins/dyngoose/issues/290)) ([7c7270e](https://github.com/benhutchins/dyngoose/commit/7c7270eb952956ac911bcbaf2b0d6db36aad6021))

# [2.0.0](https://github.com/benhutchins/dyngoose/compare/v1.12.3...v2.0.0) (2020-09-29)


### Features

* add call-chaining search support for advanced filtering and querying operations ([#133](https://github.com/benhutchins/dyngoose/issues/133)) ([19366dd](https://github.com/benhutchins/dyngoose/commit/19366dd8985f0d81c00edc83efe154d46b7fd01a)), closes [#130](https://github.com/benhutchins/dyngoose/issues/130)


### BREAKING CHANGES

* The existing `Table.search()` function has changed and it now requires you to call `.exec()` on the result, like: `Table.search({ id: 'something' }).exec()`.

## [1.12.3](https://github.com/benhutchins/dyngoose/compare/v1.12.2...v1.12.3) (2020-08-06)


### Bug Fixes

* seed utility ([#209](https://github.com/benhutchins/dyngoose/issues/209)) ([c1b2f47](https://github.com/benhutchins/dyngoose/commit/c1b2f472f334a5f3b61bca5f5022ed4eed97f819))

## [1.12.2](https://github.com/benhutchins/dyngoose/compare/v1.12.1...v1.12.2) (2020-03-11)


### Bug Fixes

* BigInt support is causing a conflict with number attributes ([fc97e5d](https://github.com/benhutchins/dyngoose/commit/fc97e5de45f1ddf69a0797fa66b40ac078d56e7b)), closes [#33](https://github.com/benhutchins/dyngoose/issues/33)

## [1.12.1](https://github.com/benhutchins/dyngoose/compare/v1.12.0...v1.12.1) (2020-02-27)


### Bug Fixes

* make aws-sdk a peerDependency to allow users to specify a version ([c15a097](https://github.com/benhutchins/dyngoose/commit/c15a097e0d8e9500a1394765d9851c790f67165d))

# [1.12.0](https://github.com/benhutchins/dyngoose/compare/v1.11.4...v1.12.0) (2020-02-25)


### Bug Fixes

* make new 'extra' optional ([23b7814](https://github.com/benhutchins/dyngoose/commit/23b78140374dc7dbd018cf945e1354ae0875a616))


### Features

* support "extra" on tables and attributes ([fc076c7](https://github.com/benhutchins/dyngoose/commit/fc076c7fd2b21d38add88482ffb9406317ac6cfe))

## [1.11.4](https://github.com/benhutchins/dyngoose/compare/v1.11.3...v1.11.4) (2020-02-21)


### Bug Fixes

* date attributes should honor desired format when output to JSON ([b6fa238](https://github.com/benhutchins/dyngoose/commit/b6fa238747ddb0e110d5d36353056933df8a210c))

## [1.11.3](https://github.com/benhutchins/dyngoose/compare/v1.11.2...v1.11.3) (2020-02-21)


### Bug Fixes

* do not use official process.env.AWS_* variables by default ([60444d5](https://github.com/benhutchins/dyngoose/commit/60444d53cf09a8b4a0264025e2e9d821b413cadd))

## [1.11.2](https://github.com/benhutchins/dyngoose/compare/v1.11.1...v1.11.2) (2020-02-21)


### Bug Fixes

* output log messages from utils/cloudformation ([4284fcb](https://github.com/benhutchins/dyngoose/commit/4284fcb5c22009bbe434b5715efa5932f2bc0689))

## [1.11.1](https://github.com/benhutchins/dyngoose/compare/v1.11.0...v1.11.1) (2020-02-21)


### Bug Fixes

* prevent use of INCLUDE without nonKeyAttributes ([9e39ab9](https://github.com/benhutchins/dyngoose/commit/9e39ab9b1ff52cb98da3917132dc13a250bfcbc0))
* usage of incorrect suffix variable in utils/cloudforamtion ([45c36a3](https://github.com/benhutchins/dyngoose/commit/45c36a3fb14532d91d72e7ffce00e66381ff32cc))

# [1.11.0](https://github.com/benhutchins/dyngoose/compare/v1.10.0...v1.11.0) (2020-02-20)


### Bug Fixes

* bug with migrate utility, typo using the wrong variable ([5a0d612](https://github.com/benhutchins/dyngoose/commit/5a0d612811456597486bc576998af4983dad6f15))


### Features

* allow any DynamoDB configuration option to be defined ([67bb421](https://github.com/benhutchins/dyngoose/commit/67bb4219dbd682801bae365997aa0906134b1ef4))

# [1.10.0](https://github.com/benhutchins/dyngoose/compare/v1.9.0...v1.10.0) (2020-02-19)


### Features

* support migrating the TTL attribute as part of migrateTable ([7a1761b](https://github.com/benhutchins/dyngoose/commit/7a1761b4287b6b54801727d1a448938ecd325c14))

# [1.9.0](https://github.com/benhutchins/dyngoose/compare/v1.8.0...v1.9.0) (2020-02-19)


### Features

* add explicit support for unix and millisecond timestamps ([17dd6ae](https://github.com/benhutchins/dyngoose/commit/17dd6aedf6fde90fb2212e7d61b334489fa57360))
* support setting a table's billing mode to PAY_PER_REQUEST ([5536e66](https://github.com/benhutchins/dyngoose/commit/5536e66cb846f35c6c153e18d7b276892aa555c9))
* support storing BigInts as numbers ([ab28bf7](https://github.com/benhutchins/dyngoose/commit/ab28bf721ac74bb705e36e7b5df33e92cab0e37b))

# [1.8.0](https://github.com/benhutchins/dyngoose/compare/v1.7.0...v1.8.0) (2020-02-19)


### Features

* add type checks to prevent errors when performing queries ([c11ae98](https://github.com/benhutchins/dyngoose/commit/c11ae984b3eac6f3da1cd152bc27945daef77238))

# [1.7.0](https://github.com/benhutchins/dyngoose/compare/v1.6.0...v1.7.0) (2020-02-19)


### Features

* pass an event with more useful data to the afterSave handler ([5aa3a0c](https://github.com/benhutchins/dyngoose/commit/5aa3a0ca0536aa1ec98bb91104c25fe1ab2127f2))

# [1.6.0](https://github.com/benhutchins/dyngoose/compare/v1.5.0...v1.6.0) (2020-02-18)


### Features

* export a Dyngoose object to help intelligent IDEs import Dyngoose ([da7bf07](https://github.com/benhutchins/dyngoose/commit/da7bf07f4849887527297d65b5e9d00bd6856faf))

# [1.5.0](https://github.com/benhutchins/dyngoose/compare/v1.4.0...v1.5.0) (2020-02-17)


### Features

* support conditions for deleting records ([66a82b3](https://github.com/benhutchins/dyngoose/commit/66a82b32e98ecea72b0cafa178777b5e194c4362))

# [1.4.0](https://github.com/benhutchins/dyngoose/compare/v1.3.0...v1.4.0) (2020-02-17)


### Features

* add strong typing for Query.PrimaryKey.update ([f5042e5](https://github.com/benhutchins/dyngoose/commit/f5042e5a3e7e07d8db82d518462295df37086a67))

# [1.3.0](https://github.com/benhutchins/dyngoose/compare/v1.2.0...v1.3.0) (2020-02-17)


### Features

* support conditional writes when saving records ([a52d1ee](https://github.com/benhutchins/dyngoose/commit/a52d1ee66d3f0f004ecf714e8e2351f3434b6492))

# [1.2.0](https://github.com/benhutchins/dyngoose/compare/v1.1.0...v1.2.0) (2020-02-17)


### Bug Fixes

* issue with dynamic attributes and date nowOnCreate and nowOnUpdate ([76eeccb](https://github.com/benhutchins/dyngoose/commit/76eeccbe2ec903ec98b02af0f49d0af3f4bd2ae9))
* issues with use of map attributes ([4703289](https://github.com/benhutchins/dyngoose/commit/4703289a231f5e426cf3469a91eb1dbf1bec1c8e))


### Features

* make Table.search avoid use of indexes for operational searches ([6547b54](https://github.com/benhutchins/dyngoose/commit/6547b546ff1380ce51cbc60ebf7abf1201102481))

# [1.1.0](https://github.com/benhutchins/dyngoose/compare/v1.0.1...v1.1.0) (2020-02-17)


### Features

* add custom error classes ([94f7329](https://github.com/benhutchins/dyngoose/commit/94f7329c0c95f1c8d9186d80d8e545967d02ebaa))
* add query filter support for LocalSecondaryIndexes ([9d79660](https://github.com/benhutchins/dyngoose/commit/9d7966064530bdad1f1685d169d7369f1bdddc28))
* add Table.new for strongly typed creation of new records ([fe821a6](https://github.com/benhutchins/dyngoose/commit/fe821a6910fc9d363fd592140ddc25cdc579e0ab))
* add Table.search generic search utility that looks for indexes ([94cd2c1](https://github.com/benhutchins/dyngoose/commit/94cd2c10a072ba692dc19565f8e6d568dc9cc64b))
* add utilities to migrate and seed tables for development ([8e81b3e](https://github.com/benhutchins/dyngoose/commit/8e81b3ea4ca75ee7606538603b0d80626ebb6c0a))
* add utility to generate CloudFormation resources ([f0d07e2](https://github.com/benhutchins/dyngoose/commit/f0d07e264be3873804339e6c1b260be06eb98a76))
* make Table.get and Table.set use property names ([2104c03](https://github.com/benhutchins/dyngoose/commit/2104c035718dae483b6cd7fd4ecfd5371edc12fc))
* stickly type queries using filters ([634c368](https://github.com/benhutchins/dyngoose/commit/634c368b16077d338ac5c0947ff404e8f30f47ef))

## [1.0.1](https://github.com/benhutchins/dyngoose/compare/v1.0.0...v1.0.1) (2020-02-16)


### Bug Fixes

* PrimaryKey.batchGet ([a116124](https://github.com/benhutchins/dyngoose/commit/a116124b032095baf24759ae0e83bd39d0b539b2))

# 1.0.0 (2020-02-16)


### Features

* merge DateTime, DateOnly, and Timestamp attributes into Date ([0d546f4](https://github.com/benhutchins/dyngoose/commit/0d546f41090a5f2a3addc99776796949bb070251))

## [0.0.9](https://github.com/benhutchins/dyngoose/compare/v2.7.1...v2.8.0) (2020-02-15)

### Initial Release
