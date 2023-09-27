

export default class AlphabeticLineSort {
  constructor (){
    this.hasScore = false;
  }

  sort(dataSet){
    dataSet.germplasmListFiltered.sort((a, b) => (
      a.name < b.name ? -1 : (
        a.name > b.name ? 1 : 0)));
  }
}