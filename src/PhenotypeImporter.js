import {Trait, TraitType} from "./Trait"


export default class PhenotypeImporter {
  constructor (){
    this.traitNames = [];
    this.experiments = [];
    this.values = [];
    this.traits = new Map();
    this.valueToIndex = new Map();
    this.phenotypes = new Map();
  }

  loadData(lines){
    let parsedHeaderLines = 0;

    for (let index = 0; index < lines.length; index += 1){
      const line = lines[index];
      if (line.startsWith('#') || (!line || line.length === 0))
        continue;

      if (line.startsWith("\t")){
        if (parsedHeaderLines == 0){  // Traits
          this.traitNames = line.split("\t").slice(1);
        } else if (parsedHeaderLines == 1){  // Experiments
          this.experiments = line.split("\t").slice(1);
        }
      } else {
        this.values.push(line.split("\t"));
      }
    }
  }

  buildTraits() {
    for (let traitIndex = 0; traitIndex < this.traitNames.length; traitIndex += 1){
      const traitName = this.traitNames[traitIndex];
      const experiment = this.experiments[traitIndex];  // May be undefined
      const values = this.values.map(germplasmValues => germplasmValues[traitIndex + 1]);
      let traitType;

      if (traitName.includes("_#CAT")){
        traitType = TraitType.Category;
        traitName = traitName.replace("_#CAT", "");
      } else if (traitName.includes("_#NUM")){
        traitType = TraitType.Numerical;
        traitName = traitName.replace("_#NUM", "");
      } else {
        const numValues = values.map(value => parseFloat(value));
        if (numValues.some(value => isNaN(value))){  // At least one value is not numerical
          traitType = TraitType.Category;
        } else {
          traitType = TraitType.Numerical;
        }
      }

      traitName = traitName.trim();
      const trait = new Trait(traitName, traitType, experiment);
      
      if (traitType == TraitType.Category){
        let valueToIndex = new Map();
        let valueIndex = 0;
        let maxLength = 0;
        values.sort();
        for (let value of values){
          if (!valueToIndex.has(value)){
            valueToIndex.set(value, valueIndex);
            valueIndex += 1;
            if (value.length > maxLength) trait.longestValue = value;
          }
        }
        this.valueToIndex.set(traitName, valueToIndex);
        trait.setValues(Array.from(valueToIndex.keys()));
        trait.setScale(0, valueIndex - 1);
      } else {
        const numValues = values.map(value => parseFloat(value));
        let minValue = numValues[0], maxValue = numValues[0];
        let maxLength = 0;
        numValues.slice(1).forEach(value => {
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;
          if (value.toString().length > maxLength) trait.longestValue = value.toString();
        })
        trait.setScale(minValue, maxValue);
      }

      this.traits.set(traitName, trait);
      this.traitNames[traitIndex] = traitName;
    }
  }

  buildPhenotypes() {
    for (let index = 0; index < this.values.length; index += 1){
      const values = this.values[index];
      const germplasmName = values[0];
      const traitValues = values.slice(1);
      const phenotype = new Map();
      for (let traitIndex = 0; traitIndex < traitValues.length; traitIndex += 1){
        const trait = this.traits.get(this.traitNames[traitIndex]);
        
        let value;
        if (trait.type == TraitType.Category){
          value = this.valueToIndex.get(trait.name).get(traitValues[traitIndex]);
        } else if (trait.type == TraitType.Numerical){
          value = parseFloat(traitValues[traitIndex].trim());
        }

        phenotype.set(trait.name, value);
      }
      this.phenotypes.set(germplasmName.trim(), phenotype);
    }
    return this.phenotypes;
  }

  parseFile(fileContents){
    const lines = fileContents.split(/\r?\n/);
    this.loadData(lines);
    this.buildTraits();
    return this.buildPhenotypes();
  }
};

