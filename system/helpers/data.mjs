export const DataHelper = {};

DataHelper.requiredInteger = { required: true, nullable: false, integer: true };

DataHelper.cost = { ...DataHelper.requiredInteger, initial: 0, min: 0 };