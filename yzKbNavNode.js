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
 * object to allow DOM elements on the page to be selected via keyboard
 */
function yzKbNavNode(params) {
    if (!arguments.length) { return }
    if (params.isDefaultFocus) {
        params.siblingNodesInfo.setDefaultNode(this);
    }
    this.id                 = params.id
    this.context           = params.jQContext;//jQuery DOM object to which current object is attached
    this.passthrough        = params.passthrough
    this.groupNav           = params.groupNav
    this.row                = params.row;
    this.col                = params.col;
    this.parentNode         = params.parentNode;
    this.siblingNodesInfo   = params.siblingNodesInfo;
    this.disabled           = params.disabled;
    this.autoScrollDisabled = params.autoScrollDisabled;
    this.parentSelectorsToNotifyOnFocus = params.parentSelectorsToNotifyOnFocus
    this.xyzPresets         = params.xyzPresets || {}
    this._movementPausedDirections   = {up: false, down: false, left: false, right: false, in: false, out:false }
    this._siblingLinksInfo = {}

    this.childNodesInfo;
    this.moveToXYCallback;
    this.moveFromXYCallback;
    this.moveToInOutCallback;
    this.moveFromInOutCallback;
    this.onFocusCallback;
    this.onKeyStrokeCallback;
    this.onUnfocusCallback;

    if (params.enterReturnVal != undefined) {
        this.enterReturnVal = params.enterReturnVal;
    } else {
        this.enterReturnVal = false;
    }

    
    this.siblingNodesInfo.addNode(this);
}
yzKbNavNode.prototype.__pageBody      = jQuery('html,body');
yzKbNavNode.prototype.goRightKeyCode  = 39; //default: right arrow key
yzKbNavNode.prototype.goLeftKeyCode   = 37; //default: left arrow key
yzKbNavNode.prototype.goUpKeyCode     = 38; //default: up arrow key
yzKbNavNode.prototype.goDownKeyCode   = 40; //default: down arrow key
yzKbNavNode.prototype.stepInKeyCode   = 13; //default: enter key
yzKbNavNode.prototype.stepOutKeyCode  = 8;  //default: backspace key
yzKbNavNode.prototype.cancelKeyCode   = 27;

yzKbNavNode.prototype.init = null
yzKbNavNode.prototype.keyCodeToDirection = {}
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.goRightKeyCode] = 'right'
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.goLeftKeyCode]  = 'left'
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.goUpKeyCode]    = 'up'
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.goDownKeyCode]  = 'down'
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.stepInKeyCode]  = 'in'
yzKbNavNode.prototype.keyCodeToDirection[yzKbNavNode.prototype.stepOutKeyCode] = 'out'

yzKbNavNode.prototype.onKeyStroke = function(keyPressEle) {
    var keyCode = keyPressEle.keyCode,
        callbackVal,
        returnVal = true;
    if (this.onKeyStrokeCallback) {
        callbackVal = this.onKeyStrokeCallback(keyPressEle);
        if (callbackVal != undefined) {
            return callbackVal
        }
    }
    if (this.movementIsPaused() && (keyCode == this.cancelKeyCode || keyCode == this.stepOutKeyCode)) {
        this.unpauseMovement();
    }
    switch (keyCode) {
        case this.goRightKeyCode:
            this.moveXYAxis('right');
            returnVal = false
            break;
        case this.goLeftKeyCode:
            this.moveXYAxis('left');
            returnVal = false
            break;
        case this.goUpKeyCode:
            this.moveXYAxis('up');
            returnVal = false
            break;
        case this.goDownKeyCode:
            this.moveXYAxis('down');
            returnVal = false
            break;
        case this.stepInKeyCode:
            this.moveZAxis('in');
            returnVal = false
            break;
        case this.stepOutKeyCode:
            this.moveZAxis('out');
            returnVal = false
            break;
    }
    //Normally the return value for the accessing the nodes is false, but when the enter key is pressed
    //special consideration needs to be taken as it may impact other behavior, i.e. returning false for
    //a form input would prevent the form from being submitted
    if (keyCode != 13) {
        return returnVal
    } else {
        return this.enterReturnVal
    }
}
yzKbNavNode.prototype.onMouseLeave = null
yzKbNavNode.prototype.onMouseEnter = null
yzKbNavNode.prototype.onDblClick = null
yzKbNavNode.prototype.onClick = function(event) {
    this.moveZAxis('in', false, true)
    return this.enterReturnVal
}
yzKbNavNode.prototype.movementIsPaused = function(direction) {
  if (direction) {
    return this._movementPausedDirections[direction]
  } else {
    return this._movementPausedDirections['up'] ||
            this._movementPausedDirections['down'] ||
            this._movementPausedDirections['left'] ||
            this._movementPausedDirections['right'] ||
            this._movementPausedDirections['in'] ||
            this._movementPausedDirections['out']
  }
}
yzKbNavNode.prototype.pauseMovement = function(direction) {
  if (direction) {
    this._movementPausedDirections[direction] = true
  } else {
    this._movementPausedDirections = {up: true, down: true, left: true, right: true, in: true, out:true }
  }
}
yzKbNavNode.prototype.unpauseMovement = function(direction) {
  if (direction) {
    this._movementPausedDirections[direction] = false
  } else {
    this._movementPausedDirections = {up: false, down: false, left: false, right: false, in: false, out:false }
  }
}
yzKbNavNode.prototype.onUnfocus = function(nextNodeToFocus) {
    if (this.onUnfocusCallback) {
        this.onUnfocusCallback(nextNodeToFocus);
    }
    this.unpauseMovement();
    this.notifyParentsOfFocus(true)
    this.context.blur();
    this.context.removeClass(YZKN_ON_FOCUS_CLASS);
}
/**
 * Makes current node the current focused node
 *
 * @params obj params optional parameters for onFocus event handler once node has been focused
 * @see yzKbNavNode.prototype.focus
 */
yzKbNavNode.prototype.focus = function(params) {
    yzKbNavManager.focusToNewNode(this, params)
}
/**
 * On focus event handler
 *
 * @param obj params optional parameter for specifying on focus event
 * {
    fromClick : bool //whether or not focus was initiated by a click
    autoScroll: bool //whether or not to center node via autoscroll
  }
 **/
yzKbNavNode.prototype.onFocus = function(params) {
    var _this = this,
        callbackResults;
        
    if (this.onFocusCallback) {
        callbackResults = this.onFocusCallback(params);
        if (callbackResults !== undefined) {
            return callbackResults
        }
    }
    this.context.focus()
    this.notifyParentsOfFocus() 
    this.centerNodeOnFocus(params)
    this.context.addClass(YZKN_ON_FOCUS_CLASS);
}
/**
 * notifies parent elements when node comes into focus
 * - unfocus bool|null if set, means that node has left focus instead of entered focus
 **/
yzKbNavNode.prototype.notifyParentsOfFocus = function(unfocus) {
    var parentElements;
    if (this.parentSelectorsToNotifyOnFocus) {
        parentElements = this.context.parents(this.parentSelectorsToNotifyOnFocus)
        if (unfocus) {
            parentElements.removeClass(YZKN_CHILD_FOCUSED_CLASS)
        } else {
            parentElements.addClass(YZKN_CHILD_FOCUSED_CLASS)
        }
    }
}
yzKbNavNode.prototype.centerNodeOnFocus = function(params) {
    var autoScrollOverride;
    if (params) {
        if ('autoScroll' in params) {
            autoScrollOverride = params.autoScroll
        }
        if ('fromClick' in params) {
            //If focus was initiated by a click, then auto scroll should be disabled
            autoScrollOverride = !params.fromClick
        }
    }
    if (autoScrollOverride == undefined) {
        if (!this.autoScrollDisabled) {
            this.centerFocusedNode()
        }
    } else if(autoScrollOverride) {
        this.centerFocusedNode()
    }
}
yzKbNavNode.prototype.enable = function() {
    this.disabled = false;
    this.context.removeClass(YZKN_DISABLED_CLASS)
}
yzKbNavNode.prototype.disable = function() {
    this.disabled = true;
    this.context.addClass(YZKN_DISABLED_CLASS)
}
/**
 * Ensure that when scrolling the currently focused node is always 
 * at the center of the viewport
 *
 **/
yzKbNavNode.prototype.centerFocusedNode = function() {
    var windowHeight, scrollAmount;
    if (window.innerHeight) {
        windowHeight = window.innerHeight
    } else {
        windowHeight = document.body.offsetHeight
    }
    //We want to scroll the next node to the center of the page
    //so that would be the the distance between the center of the page
    //and the distance of the new node from the top of the page
    scrollAmount = windowHeight/2 - this.context.offset().top
    this.__pageBody.animate({scrollTop: 0-scrollAmount}, 270)
    return true
};
/**
 * Detaches current node along with all nodes in its row from the sibling rows
 **/
yzKbNavNode.prototype.detachNodeRow = function() {
    var upperRowNode = this.getLinkedNode('up'),
        lowerRowNode = this.getLinkedNode('down'),
        upperRowNum = upperRowNode ? upperRowNode.row : null,
        lowerRowNum = lowerRowNode ? lowerRowNode.row : null;
    this.siblingNodesInfo.linkRows(upperRowNum, lowerRowNum, 'down')
    this.siblingNodesInfo.linkRows(lowerRowNum, upperRowNum, 'up')
}
/**
 * Attaches the current node along with all nodes in its row into a new location
 *
 * @param string      position   'before'|'after' determines if the current row of nodes will be inserted before or after the target node's row
 * @param yzKbNavNode targetNode node whose row will be used to determine insertion location of current node's row
 **/
yzKbNavNode.prototype.insertNodeRow = function(position, targetNode) {
    var upperRowNode,
        lowerRowNode,
        upperRowNum,
        lowerRowNum;
    if (position == 'after') {
        upperRowNode = targetNode
        lowerRowNode = targetNode.getLinkedNode('down')
    } else if (position == 'before') {
        upperRowNode = targetNode.getLinkedNode('up')
        lowerRowNode = targetNode
    }
    upperRowNum = upperRowNode ? upperRowNode.row : null
    lowerRowNum = lowerRowNode ? lowerRowNode.row : null

    //attach inserted node to its upper sibling
    this.siblingNodesInfo.linkRows(this.row, upperRowNum, 'up')
    if (upperRowNum !== undefined) {
        this.siblingNodesInfo.linkRows(upperRowNum, this.row, 'down')
    }
    //attach inserted node to its lower sibling
    this.siblingNodesInfo.linkRows(this.row, lowerRowNum, 'down')
    if (lowerRowNum !== undefined) {
        this.siblingNodesInfo.linkRows(lowerRowNum, this.row, 'up')
    }
}
yzKbNavNode.prototype.setLinkedNode = function(direction, node) {
    this._siblingLinksInfo[direction] = node
}
/**
 * gets the node connected to the current node from one of the allowed directions
 *
 * @param string direction 'up'|'down'|'left'|'right'
 * */
yzKbNavNode.prototype.getLinkedNode = function(direction) {
    var nextNode;
    if (direction in this._siblingLinksInfo) {
        nextNode = this._siblingLinksInfo[direction]
    } else {
        switch (direction) {
            case 'up':
            case 'down':
                nextNode = this.siblingNodesInfo.getNextNodeYAxis(direction, this.row, this.col);
                this.setLinkedNode(direction, nextNode)
                break;
            case 'left':
            case 'right':
                nextNode = this.siblingNodesInfo.getNextNodeXAxis(direction, this.row, this.col);
                this.setLinkedNode(direction, nextNode)
                break;
        }        
    }
    return nextNode;
}
yzKbNavNode.prototype.moveXYAxis = function(direction, fromGroupNav) {
    var callbackVal;
    if (this.moveFromXYCallback) {
        callbackVal = this.moveFromXYCallback(direction, fromGroupNav)
        if (callbackVal != undefined) {
            return callbackVal
        }
    }
    if (fromGroupNav && (!this.groupNav && !this.passthrough)) {
        return false;
    }
    if (this.movementIsPaused(direction)) {
        return
    }
    if (direction in this.xyzPresets) {
        // if current direction is set in xyz presets, then focus to the reset node instead
        var presetNode = yzKbNavManager.getNodeByDom($('#' + this.xyzPresets[direction]))
        return yzKbNavManager.focusToNewNode(presetNode)
    }
    var nextNode = this.getLinkedNode(direction)
    if (nextNode) {
        //If the next node is disabled, then just have it pass down the current action to the next active node
        if (nextNode.disabled) {
            return nextNode.moveXYAxis(direction)
        }
        if (fromGroupNav || nextNode.passthrough) {
            this.siblingNodesInfo.setDefaultNode(this)
            return nextNode.moveZAxis('in', true);
        } else {
            if (this.moveToXYCallback) {
                callbackVal = this.moveToXYCallback(direction, nextNode)
                if (callbackVal != undefined) {
                    return callbackVal
                }
            }
            return yzKbNavManager.focusToNewNode(nextNode);
        }
    } else if (this.parentNode) {
        this.siblingNodesInfo.setDefaultNode(this)
        return this.parentNode.moveXYAxis(direction, true);
    }
    return;
}
yzKbNavNode.prototype.moveZAxis = function(direction, fromGroupNav, fromClick) {
    var nextNode, getNextNode, callbackVal, onFocusParams
        thisObj = this;
    if (fromClick) { 
        if (this.passthrough || this.groupNav) {
            //If the step in is triggered from click instead of keyboard enter, then, we won't need
            //to worry about stepping in via passthrough because the mouse click is very conconcise,
            //if the user wanted to click on a specific button, the javascript will register it
            return false            
        } else {
            //Nodes focused on via mouse clicks should not enable autoscroll as that could
            //get confusing
            onFocusParams = { fromClick: fromClick }
        }
    }
    if (this.moveFromInOutCallback) {
        callbackVal = this.moveFromInOutCallback(direction, fromGroupNav, fromClick)
        if (callbackVal != undefined) {
            return callbackVal
        }
    }
    if (this.movementIsPaused(direction)) {
        return
    }
    if (direction in this.xyzPresets) {
        // if current direction is set in xyz presets, then focus to the reset node instead
        var presetNode = yzKbNavManager.getNodeByDom($('#' + this.xyzPresets[direction]))
        return yzKbNavManager.focusToNewNode(presetNode)
    }    
    switch (direction) {
        case 'out':
            nextNode = this.parentNode;
            this.siblingNodesInfo.setDefaultNode(this)
            break;
        case 'in':
            if (this.childNodesInfo) {
                nextNode = this.childNodesInfo.getDefaultNode();
            }
            break;
    }
    if (nextNode) {
        if (nextNode.passthrough || nextNode.groupNav) {
            return nextNode.moveZAxis(direction, true);
        } else {
            //Checks for callback for when user presses enter or clicks on node, 
            //if result is false, then focus is not changed
            if (this.moveToInOutCallback) {
                callbackVal = this.moveToInOutCallback(direction, nextNode, fromGroupNav, fromClick)
                if (callbackVal != undefined) {
                    return callbackVal
                }
            }
            return nextNode.focus(onFocusParams);
        }
    } else {
        //Checks for callback for when user presses enter or clicks on node
        if (this.moveToInOutCallback) {
            callbackVal = this.moveToInOutCallback(direction, nextNode, fromGroupNav, fromClick)
            if (callbackVal != undefined) {
                return callbackVal
            }
        }
        return this.focus(onFocusParams);
    }
}

/**
 * Destroys current node
 *
 * @param bool forgoDetachingFirst Generally when a node is destroyed, 
    its first detached from its siblings, but if we are doing a recursive delete
    then all its siblings will be deleted anyways, so no point in doing a detach
 */
yzKbNavNode.prototype.destroy = function(forgoDetachingFirst) {
    if (!forgoDetachingFirst) {
        this.detachNodeRow()
    }
    if (this.childNodesInfo) {
        this.childNodesInfo.destroyAllNodesAndDelete()
    }
    yzKbNavManager.unregisterNode(this.id)
    this.context.removeData(YZKN_DATA_KEY)
    delete this
}
yzKbNavNode.prototype.destroyChildren = function() {
    if (this.childNodesInfo) {
        this.childNodesInfo.destroyAllNodesAndDelete()
    }
}