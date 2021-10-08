

export default class ImportingOrderLineSort {
  constructor(){
    this.hasScore = false;
  }

  sort(dataSet){
    dataSet.germplasmList.sort((a, b) => dataSet.importingOrder.indexOf(a.name) - dataSet.importingOrder.indexOf(b.name));
  }

  setChromosomes(chromosomeIndices){
    
  }
}