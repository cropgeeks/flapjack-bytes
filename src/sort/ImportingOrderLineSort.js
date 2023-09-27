

export default class ImportingOrderLineSort {
  constructor(){
    this.hasScore = false;
  }

  sort(dataSet){
    dataSet.germplasmListFiltered.sort((a, b) => dataSet.importingOrder.indexOf(a.name) - dataSet.importingOrder.indexOf(b.name));
  }
}