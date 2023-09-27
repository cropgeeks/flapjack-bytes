

export default class TraitLineSort {
  constructor (traitName){
    this.hasScore = false;
    this.traitName = traitName;
  }

  sort(dataSet){
    const self = this;
    const trait = dataSet.getTrait(self.traitName);
    dataSet.germplasmListFiltered.sort((a, b) => dataSet.importingOrder.indexOf(a.name) - dataSet.importingOrder.indexOf(b.name)).sort(function (a, b){
      if (a.phenotype === undefined) return 1;
      if (b.phenotype === undefined) return -1;
      const valueA = a.getPhenotype(self.traitName);  // No need to getValue, the valueIndex are already sorted for category traits
      if (valueA === undefined) return 1;
      const valueB = b.getPhenotype(self.traitName);
      if (valueB === undefined) return -1;
      if (valueA < valueB) return -1;
      if (valueB < valueA) return 1;
      if (valueA == valueB) return 0;
    });
  }


  setTrait(traitName){
    this.traitName = traitName;
  }
}