export default class GermplasmDataSet {
  constructor(germplasmList) {
    this.germplasmList = germplasmList;
  }

  germplasmFor(germplasmStart, germplasmEnd) {
    return this.germplasmList.slice(germplasmStart, germplasmEnd);
  }
}
