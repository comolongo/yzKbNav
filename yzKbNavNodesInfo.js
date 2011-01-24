/**
 * YzKbNavNode
 * Enables keyboard navigation on webpage
 *
 * Copyright (c) 2010 Weiss I Nicht <KeineAhnung@atliva.com> 
 * @author Weiss I Nicht 
 * (sha-1: 90f01291285340bf03c2d41952c4b21b3d338907)
 * http://github.com/comolongo/yzKbNav
 **/

/**
 * Holds and calculates the position details for a group of nodes
 * that share the same xy plane
 */
function yzKbNavNodesInfo() {
    this._defaultNode = null;
    this._map      = {};//Set of nested objects to hold nodes
    this._rowIdx   = [];//Sorted index of keys to look up node rows
    this._colIdx   = {};//Hash of sorted indexes of keys to look up node columns
    //Hash of to store information about whether certain columns have been sorted
    this._idxSortChecklist  = {};
    this._upperLeftMostNode;
}

/**
 * Checks if the requested row or column indexes have been sorted
 * 
 * @param int row (optional) if set indicates the row for the column index to sort,
 *                  otherwise just sort the row index
 **/
yzKbNavNodesInfo.prototype._checkAndSortIdx = function(row) {
    if (!('rowsListSorted' in this._idxSortChecklist)) {
        this._idxSortChecklist['rowsListSorted'] = true;
        this._rowIdx.sort(__yzKbniALargerThanB)
    }
    if (row && !(row in this._idxSortChecklist)) {
        this._idxSortChecklist[row] = true;
        this._colIdx[row].sort(__yzKbniALargerThanB);
    }
}
/**
 * function used in sort method to order items in numeric order
**/
function __yzKbniALargerThanB(a,b) {
    return a-b;
}
/**
 * Gets the node that could be focused on by default
 */
yzKbNavNodesInfo.prototype.getDefaultNode = function() {
    var defaultNode, firstNodeInRow, initialNode;
    if (!this._defaultNode) {
         this._defaultNode = this._getUpperLeftMostNode()
    }
    //If the default node is disabled, then we move down the matrix to the right to search for 
    //the next active node
    if (this._defaultNode && this._defaultNode.disabled) {
        defaultNode    = this._defaultNode
        firstNodeInRow = defaultNode
        initialNode    = defaultNode
        do {
            //Get the next node to the right
            nextDefaultNode = defaultNode.getLinkedNode('right')
            //If we are at the end of a column, then the will be no node to the right, so we
            //look at the beginning of the next row
            if (!nextDefaultNode) {
                nextDefaultNode  = firstNodeInRow.getLinkedNode('down')
                //If we are at the last column of the last row, then there won't be a 
                //next column, so we loop back to the first column of the first row
                if (!nextDefaultNode) {
                    nextDefaultNode = this._getUpperLeftMostNode()
                }
                firstNodeInRow = nextDefaultNode
            }
            defaultNode = nextDefaultNode;
        } while(defaultNode && defaultNode.disabled &&
            //Making sure we don't go into an infinite loop
            defaultNode.id != initialNode.id);
        if (defaultNode.disabled) {
            this._defaultNode = false;
        } else {
            this._defaultNode = defaultNode
        }
    }
    return this._defaultNode;
}
yzKbNavNodesInfo.prototype._getUpperLeftMostNode = function() {
    var firstRow, firstCol;
    if (!this.__upperLeftMostNode) {
        this._checkAndSortIdx()
        firstRow = this._rowIdx[0]
        this._checkAndSortIdx(firstRow)
        firstCol = this._colIdx[firstRow][0]
        this.__upperLeftMostNode = this._map[firstRow][firstCol]
    }
    return this.__upperLeftMostNode
}
yzKbNavNodesInfo.prototype.setDefaultNode = function(defaultNode) {
    this._defaultNode = defaultNode;
}
/**
 * Attaches a node
 *
 * @param yzKbNavNode
 */
yzKbNavNodesInfo.prototype.addNode = function(newNode) {
    var lastRow, lastRowKey, lastCol, lastColKey;
    //SETTING UP ROW INFO:
    //when row is auto, assign it to one bigger than its current largest row        
    if (newNode.row == 'auto') {
        lastRowKey = this._rowIdx.length - 1;
        if (lastRowKey in this._rowIdx) {
           newNode.row = this._rowIdx[lastRowKey] + 1;
        } else {
           newNode.row = 0;
        }
    }
    //If current row does not exist, create it
    if (!this._map[newNode.row]) {
       this._map[newNode.row] = {};
    }
    //If the current row is not in the row index, then add it
    if (this._rowIdx.indexOf(newNode.row) < 0) {
       this._rowIdx.push(newNode.row);
    }
    //SETTING UP COLUMN INFO:
    //If the row for the current column in the column index does not exist then create it
    if (!(newNode.row in this._colIdx)) {
       this._colIdx[newNode.row] = [];
    }
    //If current column is auto, then assign it to 1 larger than the current largest column number
    if (newNode.col == 'auto') {
        lastColKey = this._colIdx[newNode.row].length - 1;
        if (lastColKey in this._colIdx[newNode.row]) {
            newNode.col = this._colIdx[newNode.row][lastColKey] + 1;            
        } else {
            newNode.col = 0;
        }
    }
    this._colIdx[newNode.row].push(newNode.col);
    this._map[newNode.row][newNode.col] = newNode;
}
/**
 * Retrieves the next node to focus on for keyboard movements on the y axis
 *
 * @param string     direction  up|down
 * @param string|int currentRow current row number or 'auto'
 * @param string|int currentCol current col number or 'auto'
 */
yzKbNavNodesInfo.prototype.getNextNodeYAxis = function(direction, currentRow, currentCol) {
    var directionalityOffset, i, nextRow, nextRowKey, nextRowColumns,
        iColumnDistance, closestColumnDistance, closestColumn, nextNode;
    //Default direction is up, so default offset is -1 (top of the array is 0 and increases)
    if (direction == 'down') {
        directionalityOffset = 1;
    } else {
        directionalityOffset = -1;
    }
    this._checkAndSortIdx();
    nextRowKey = this._rowIdx.indexOf(currentRow) + directionalityOffset;
    if (nextRowKey in this._rowIdx) {
        nextRow = this._rowIdx[nextRowKey];
        this._checkAndSortIdx(currentRow);
        nextRowColumns = this._colIdx[nextRow];
        //Find the column in the new row that is the closest matching to the current column
        closestColumn = this.__findClosestNumInList(currentCol, nextRowColumns)
        nextNode = this._map[nextRow][closestColumn];
        this.setDefaultNode(nextNode)
        return nextNode;
    }
    return false;
}
/**
 * Connect all the nodes from the source node to point up or down to the nodes of the target row
 *
 * @param int    sourceRowNum            index (_rowIdx key) of source row; the row whose nodes will connect to target row
 * @param int    targetRowNum            index of target row; the row whose nodes will be linked to by the source row
 * @param string sourceToTargetDirection 'up'||'down', direction to which source row will connect to target row
 **/
yzKbNavNodesInfo.prototype.linkRows = function(sourceRowNum, targetRowNum, sourceToTargetDirection) {
    var sourceRowCols = this._colIdx[sourceRowNum],
        sourceRowColNum,
        sourceRowColIdx,
        sourceRowNode,
        targetRowCols,
        nearstTargetRowCol,
        nearstTargetNode;
    if (sourceRowCols) {
        sourceRowColIdx = sourceRowCols.length
    }
    if (targetRowNum !== undefined && targetRowNum !== null && targetRowNum in this._colIdx) {
        targetRowCols = this._colIdx[targetRowNum]
    }
    while(sourceRowColIdx--) {
        sourceRowColNum = sourceRowCols[sourceRowColIdx]
        sourceRowNode = this._map[sourceRowNum][sourceRowColNum]
        if (targetRowCols) {
            nearstTargetRowCol = this.__findClosestNumInList(sourceRowColNum, targetRowCols)
            nearstTargetNode   = this._map[targetRowNum][nearstTargetRowCol]
        }
        sourceRowNode.setLinkedNode(sourceToTargetDirection, nearstTargetNode)
    }
    //If the source node does not have a node above it, that means it must be at the very top row
    if (!targetRowNum && sourceToTargetDirection == 'up' && sourceRowCols.length) {
        //If we are indeed at the upper most row, then get the left most column
        this.__upperLeftMostNode = this._map[sourceRowNum][sourceRowCols[0]]
    }
}
yzKbNavNodesInfo.prototype.__findClosestNumInList = function(num, list) {
    var idx, lbListVal, ubListVal, iListVal,
        upperBoundIdx = list.length -1,
        lowerBoundIdx = 0;
    //Binary search
    while (lowerBoundIdx <= upperBoundIdx) {
        idx = Math.floor((lowerBoundIdx + upperBoundIdx)/2)
        iListVal = list[idx]
        if (num < iListVal) {
            upperBoundIdx = idx - 1
        } else if (num > iListVal) {
            lowerBoundIdx = idx + 1
        } else {
            return iListVal
        }
    }
    //Check among the last two indexes which one is closer to given number
    if (lowerBoundIdx != upperBoundIdx) {
        lbListVal = list[lowerBoundIdx]
        ubListVal = list[upperBoundIdx]
        //check that the lower and upper bounds are valid
        if (lowerBoundIdx < 0) {
            return ubListVal
        } else if (upperBoundIdx < 0) {
            return lbListVal
        }
        return Math.abs(lbListVal - num) < Math.abs(ubListVal - num) ? lbListVal : ubListVal            
    }
}
/**
 * Retrieves the next node to focus on for keyboard movements on the x axis
 *
 * @param string     direction  left|right
 * @param string|int currentRow current row number or 'auto'
 * @param string|int currentCol current col number or 'auto'
 */
yzKbNavNodesInfo.prototype.getNextNodeXAxis = function(direction, currentRow, currentCol) {
    var directionalityOffset, colKey, nextCol, nextColKey, nextNode;
    //Default direction is right, so default offset is 1
    if (direction == 'left') {
        directionalityOffset = -1;
    } else {
        directionalityOffset = 1;
    }
    this._checkAndSortIdx(currentRow);
    colKey = this._colIdx[currentRow].indexOf(currentCol)
    //depending on direction, we either move forward or backwards in the array
    nextColKey = colKey + directionalityOffset;

    //check if the next column key exists, if it does, we can use the key to get the
    //actual column and thereby get the node
    if (nextColKey in this._colIdx[currentRow]) {
        nextCol = this._colIdx[currentRow][nextColKey];
        nextNode = this._map[currentRow][nextCol];
        this.setDefaultNode(nextNode);
        return nextNode;
    }
    return false;
}
yzKbNavNodesInfo.prototype.shiftRows = function(startRow, numRowsToShift) {
    var startRowIdx = this._rowIdx.indexOf(startRow),
        curRowNum,
        curRowIdx = this._rowIdx.length - 1,
        numRowIdxToShift = curRowIdx - startRowIdx,
        curColNum,
        curRowCols,
        newRowNum,
        newRowIdx,
        node;
    do {
        curRowNum = this._rowIdx[curRowIdx]
        curRowCols = this._colIdx[curRowNum]
        curColIdx = curRowCols.length - 1
        do {
            //Iterate through each node in the column to update row info
            //Also update this._map to reflect new location of the node
            curColNum = curRowCols[curColIdx]
            node = this._map[curRowNum][curColNum]
            newRowNum = curRowNum + numRowsToShift
            node.row = newRowNum
            delete this._map[curRowNum][curColNum]
            if (!(node.row in this._map)) {
                this._map[node.row] = {}
            }
            this._map[node.row][node.col] = node
        } while(curColIdx--)
        delete this._map[curRowNum]
        this._rowIdx[curRowIdx + numRowIdxToShift] = newRowNum
        this._colIdx[newRowNum] = curRowCols
        delete this._colIdx[curRowNum]
    } while(startRowIdx < curRowIdx--)
}

/**
 * Deletes current object
 */
yzKbNavNodesInfo.prototype.destroy = function() {
    delete this
}
/**
 * Deletes nodes connected to current object
 */
yzKbNavNodesInfo.prototype.destroyAllNodesAndDelete = function() {
    var row, node, map = this._map;
    for (row in this._map) {
        for (col in row) {
            this._map[row][col].destroy(true);
        }
    }
    this._map      = {}
    this._rowIdx   = [];
    this._colIdx   = {};
    this.destroy()
}