

export default importingOrderLineSort(){
	return function (dataSet) {
		dataSet.germplasmList.sort((a, b) => dataSet.importingOrder.find(b.name) - dataSet.importingOrder.find(a.name));
	}
}