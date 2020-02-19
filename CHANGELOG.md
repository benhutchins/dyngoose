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
