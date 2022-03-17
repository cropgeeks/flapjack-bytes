

export default class AlphabeticLineSort {
  constructor (){
    this.hasScore = false;
  }

  sort(dataSet){
    dataSet.germplasmList.sort((a, b) => (
      a.name < b.name ? -1 : (
        a.name > b.name ? 1 : 0)));
  }
}