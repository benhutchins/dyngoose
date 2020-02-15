export const enum DynamoAttributeType {
  Binary = 'B',
  BinarySet = 'BS',
  Boolean = 'BOOL',
  List = 'L',
  Map = 'M',
  Null = 'NULL',
  Number = 'N',
  NumberSet = 'NS',
  String = 'S',
  StringSet = 'SS',
}

export type DynamoAttributeTypes = DynamoAttributeType | 'B' | 'BS' | 'BOOL' | 'L' | 'M' | 'NULL' | 'N' | 'NS' | 'S' | 'SS'
