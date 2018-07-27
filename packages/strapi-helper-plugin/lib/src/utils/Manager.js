const { findIndex, pullAt, range } = require('lodash');
const { List } = require('immutable');

class Manager {
  constructor(state, list, keys, index, layout) {
    this.state = state;
    this.keys = keys.split('.');
    this.layout = layout;
    this.list = list;
    this.index = index;
    this.arrayOfEndLineElements = this.getLinesBound();
    this.attrToRemoveInfos = this.attrToRemoveInfos();
  }

  /**
   * Retrieve the bootstrap col index, name and type of a field
   * @param {Number} index 
   * @returns {Object}
   */
  getAttrInfos(index) {
    const name = this.getAttrName(index);
    const appearance = this.layout.getIn([name, 'appearance']);
    const type = appearance !== '' && appearance !== undefined ? appearance : this.getType(name);
    const bootstrapCol = this.getBootStrapCol(type);

    const infos = {
      bootstrapCol,
      index,
      name,
      type,
    };

    return infos;
  }

  getColsToAdd(number) {
    let ret;

    switch(number) {
      case 9:
        ret = ['__col-md-3__', '__col-md-6__'];
        break;
      case 8:
        ret = ['__col-md-4__', '__col-md-4__'];
        break;
      case 4:
        ret = ['__col-md-4__'];
        break;
      case 6:
        ret = ['__col-md-6__'];
        break;
      default:
        ret = ['__col-md-3__'];
    }
    const random = Math.floor(Math.random() * 1000);

    return ret.map(v => `${v}${random}`);
  }

  /**
   * Retrieve a field default bootstrap col
   * NOTE: will change if we add the customisation of an input's width
   * @param {String} type 
   * @returns {Number}
   */
  getBootStrapCol(type) {
    switch(type) {
      case 'checkbox':
      case 'boolean':
      case 'date':
        return 4;
      case 'json':
      case 'wysiwyg':
      case 'WYSIWYG':
        return 12;
      default:
        return 6;
    }
  }

  getElementsOnALine(itemsToPull, arr = this.list) {
    const array = List.isList(arr) ? arr.toJS() : arr;

    return pullAt(array, itemsToPull);
  }

  /**
   * Retrieve the field to remove infos
   * @returns {Object}
   */
  attrToRemoveInfos() {
    return this.getAttrInfos(this.index);
  }

  /**
   * 
   * Retrieve the last element of each bootstrap line
   * @returns {Array}
   */
  getLinesBound() { // NOTE: doesn't work for the last element if the line is not full!
    const array = [];
    let sum = 0;

    this.list.forEach((item, i) => {
      let { bootstrapCol, index, name, type } = this.getAttrInfos(i);

      if (!type && name.includes('__col')) {
        bootstrapCol = parseInt(name.split('__')[1].split('-')[2], 10);
      }

      sum += bootstrapCol;

      if (sum === 12 || bootstrapCol === 12) {
        const isFullSize = bootstrapCol === 12;
        array.push({ name, index, isFullSize });
        sum = 0;
      }

      if (sum > 12) {
        sum = 0;
      }

      if (i < this.list.size - 1) {
        let { bootstrapCol: nextBootstrapCol, name: nextName, type: nextType } = this.getAttrInfos(i + 1);
        
        if (!nextType && nextName.includes('__col')) {
          nextBootstrapCol = parseInt(nextName.split('__')[1].split('-')[2], 10);
        }

        if (sum + nextBootstrapCol > 12) {
          const isFullSize = bootstrapCol === 12;
          array.push({ name, index, isFullSize });
          sum = 0;
        }
      }
    });

    return array;
  }

  /**
   * 
   * Retrieve the field's type depending on its name
   * @param {String} itemName 
   * @returns {String}
   */
  getType(itemName) {
    return this.state
      .getIn(['modifiedSchema', 'models', ...this.keys, 'availableFields', itemName, 'type']);
  }

  /**
   * Retrieve a field name depending on its index
   * @param {Number} itemIndex
   * @returns {String}
   */
  getAttrName(itemIndex){
    return this.state
      .getIn(['modifiedSchema', 'models', ...this.keys, 'fields', itemIndex]);
  }

  /**
   * Retrieve the line bootstrap col sum
   * @param {Number} leftBound 
   * @param {Number} rightBound 
   * @returns {Number}
   */

  getLineSize(elements) {
    return elements.reduce((acc, current) => {
      const appearance = this.layout.getIn([current, 'appearance']);
      const type = appearance !== '' && appearance !== undefined ? appearance : this.getType(current);
      const col = current.includes('__col') ? parseInt(current.split('__')[1].split('-')[2], 10) : this.getBootStrapCol(type);

      return acc += col;
    }, 0);
  }

  /**
   * 
   * @param {Bool} dir sup or min
   * @param {Number} pivot the center
   * @returns {Object} the first sup or last sup
   */
  getBound(dir, pivot = this.index) {
    let result = {};
    let hasResult = false;

    this.arrayOfEndLineElements.forEach(item => {
      const rightBondCond = findIndex(this.arrayOfEndLineElements, ['index', pivot]) !== -1 ? item.index < pivot : item.index <= pivot;
      const cond = dir === true ? item.index >= pivot && !hasResult : rightBondCond;

      if (cond) {
        hasResult = true;
        result = dir === true ? item : { name: this.list.get(item.index + 1), index: item.index + 1, isFullSize: false };
      }
    });

    return result;
  }

  getLayout() {
    let newList = this.list;
    let sum = 0;

    this.arrayOfEndLineElements.forEach((item, i) => {
      const firstLineItem = i === 0 ? 0 : this.arrayOfEndLineElements[i - 1].index +1;
      const lastLineItem = item.index + 1;
      const lineRange = firstLineItem === lastLineItem ? [firstLineItem] : range(firstLineItem, lastLineItem);
      const lineItems = this.getElementsOnALine(lineRange);
      const lineSize = this.getLineSize(lineItems);

      if (lineSize < 10 && i < this.arrayOfEndLineElements.length - 1) {
        const colsToAdd = this.getColsToAdd(12 - lineSize);
        newList = newList.insert(lastLineItem + sum, colsToAdd[0]);
        
        if (colsToAdd.length > 1) {
          newList = newList.insert(lastLineItem + sum, colsToAdd[1]);
        }
        sum += 1;
      }
    });

    return newList;
  }
}

module.exports = Manager;