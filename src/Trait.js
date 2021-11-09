export const TraitType = {
  Category: 0,
  Numerical: 1,
};

export class Trait {
  constructor (name, type, experiment){
    this.name = name;
    this.type = type;
    this.experiment = experiment;
    this.values = undefined;
    this.longestValue = undefined;
  }

  setValues (values){
    this.values = values;
  }

  setScale (min, max){
    this.minValue = min;
    this.maxValue = max;
  }

  scaleValue (value){
    return (value - this.minValue) / (this.maxValue - this.minValue);
  }

  getValue (value) {
    if (this.type == TraitType.Category) {
      return this.values[value];
    } else {
      return value;
    }
  }
};