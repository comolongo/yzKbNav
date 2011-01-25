/**
 * YzKbNavNode
 * Enables keyboard navigation on webpage
 *
 * Copyright (c) 2010 Weiss I Nicht <KeineAhnung@atliva.com> 
 * @author Weiss I Nicht 
 * (sha-1: 90f01291285340bf03c2d41952c4b21b3d338907)
 * http://github.com/comolongo/yzKbNav
 **/
var YZKN_SELECTOR = '.yzkn', //CSS selector use to enable elements to be accessable via yzKbNav
    YZKN_DATA_KEY = 'yzKbNavIdx',
    YZKN_CHILD_FOCUSED_CLASS = 'yzkn-child-infocus',//indicates that a child node is currently in focus
    YZKN_DISABLED_CLASS = 'yzkn-disabled',
    YZKN_ON_FOCUS_CLASS = 'focus', //class CSS name to assign node when it is being focused
    // Sets a node to be the first to receive focus among its siblings when stepping in from parent node
    YZKN_DEFAULT_FOCUS_CLASS = 'yzkn-default-focus', 
    YZKN_POSITION_ATTR = 'data-yzkn-pos',
    //attribute for jquery selectors of closest parents to notify when kb node comes into focus
    YZKN_FOCUS_NOTIFY_SELECTORS_ATTR = 'data-yzkn-fns' 
    // sets a parent node to automatically passthrough focus immediately to child nodes
    YZKN_PASSTHROUGH_CLASS = 'yzkn-passthrough';
    YZKN_GROUPNAV_CLASS = 'yzkn-groupnav'
    YZKN_AUTO_SCROLL_DISABLED_CLASS = 'yzkn-disable-auto-scroll'
    // Sets a node and its decendents to be out side of the default navigation flow,
    // i.e. other parent and sibling nodes will not know about the solo node
    YZKN_IS_SOLO_CLASS = 'yzkn-solo'
    // allows focus to 
    YZKN_PRESET_XYZ_ATTR = 'data-yzkn-xyz',
    //Attribute for indicating which movement directions are paused when focused into text input fields
    YZKN_FIELDMVT_ATTR = 'data-yzkn-fieldmvt'
/**
 * Global collection for tracking yzKbNavNode objects and listening for mouse and keyboard actions
 **/
var yzKbNavManager = function() {
    var _collections = {}, //collections hash to track all yzKbNavNode objects
        _collectionsCntr = 0,
        _currentFocusedNode,
        _previouslyFocusedNode;
    /**
     * Sets the onclick and keypress event handlers to bring focus to next yzKbNode and it's
     * corresponding dom element
     **/
    var _setEventHandlers = function() {
        //Listens to keybard presses set focus on next appropriate yzKbNode object
        jQuery(document).bind('keydown',function(ele) {
            return _currentFocusedNode.onKeyStroke(ele);
        });
        $(YZKN_SELECTOR)
        .live('mouseout', function(event) {
            var kbNodeKey = jQuery(this).data(YZKN_DATA_KEY);
            if (!(kbNodeKey in _collections)) {return}
            if (_collections[kbNodeKey].disabled) {return}
            //Check if the node to be focused on is already the current node
            if (_currentFocusedNode && _currentFocusedNode.id == kbNodeKey) {return}
            if (_collections[kbNodeKey].onMouseOut) {
                _collections[kbNodeKey].onMouseOut(event);                
            }
            return true
        })
        .live('mouseleave', function(event) {
            var kbNodeKey = jQuery(this).data(YZKN_DATA_KEY);
            if (!(kbNodeKey in _collections)) {return}
            if (_collections[kbNodeKey].disabled) {return}
            //Check if the node to be focused on is already the current node
            if (_currentFocusedNode && _currentFocusedNode.id == kbNodeKey) {return}
            if (_collections[kbNodeKey].onMouseLeave) {
                _collections[kbNodeKey].onMouseLeave(event);                
            }
            return true
        })
        .live('mouseenter', function(event) {
            var kbNodeKey = jQuery(this).data(YZKN_DATA_KEY);
            if (!(kbNodeKey in _collections)) {return}
            if (_collections[kbNodeKey].disabled) {return}
            //Check if the node to be focused on is already the current node
            if (_collections[kbNodeKey].onMouseEnter) {
                return _collections[kbNodeKey].onMouseEnter(event)
            }
        })
        .live('click', function(event) {
            var kbNodeKey = jQuery(this).data(YZKN_DATA_KEY);
            if (!(kbNodeKey in _collections)) {return}
            if (_collections[kbNodeKey].disabled) {return}
            //Check if the node to be focused on is already the current node
            return _collections[kbNodeKey].onClick(event)
        })
        .live('dblclick', function(event) {
            var kbNodeKey = jQuery(this).data(YZKN_DATA_KEY);
            if (!(kbNodeKey in _collections)) {return}
            if (_collections[kbNodeKey].inactive) {return}
            //Check if the node to be focused on is already the current node
            if (_collections[kbNodeKey].onDblClick) {
                return _collections[kbNodeKey].onDblClick(event)
            }
        })
    }        
    return {
        topLevelNodesInfo: null,
        /**
         * Attach nodes to applicable elements on the page
         **/
        init: function() {
            var startNode, _this = this;
            this.topLevelNodesInfo = new yzKbNavNodesInfo();
            jQuery(YZKN_SELECTOR).each(function(){
                _this.registerDomEle(this);
            });
            startNode = this.topLevelNodesInfo.getDefaultNode();
            while (startNode.passthrough || startNode.groupNav) {
                startNode = startNode.childNodesInfo.getDefaultNode();
            }
            this.focusToNewNode(startNode);
            _setEventHandlers();
        },
        /**
         * Registers a dom element so it can be accessable via keyboard
         *
         * @param DomElement ele                   DOM element usually retrieved with a jquery selector e.g. $('.kn')
         * @param yzKbNode   params.parentNode     parent node that the registered element will goto when 
                                                    it is stepping out (i.e. pressing backspace). Parent node
                                                    will also determine the sibling elements that can be traversed to
         * @param yzKbNode   params.siblingNodesInfo   (optional) sets siblings info node
         * @param int|string params.row            row position of registered element. Usually an int, but can be set
                                                    to 'auto', in which case the row will be the next new row
         * @param int|string params.col            col position, analogus to row
         * @param bool       params.passthrough    whether or not node can be focused on or if it will just passthrough
                                                    its movement to the next parent/child
         * @param bool       params.isDefaultFocus whether if node will be focused on by default among its siblings
         * @param bool       params.disabled       whether if node will be disabled upon initial instantiation
         * @param bool       params.autoScrollDisabled whether if scrolling will be disabled by default
         *
         * @return yzKbNavNode
         */
        registerDomEle: function(ele, params) {
            //Params:
            //parentNode, siblingNodesInfo, isSoloNode, row, col, 
            //passthrough, isDefaultFocus, disabled, autoScrollDisabled
            if (!params) { params = {} }
            var newNode, newNodeIdx, positionInfo, nodeClass, disabled,
                parentSelectorsToNotifyOnFocus,
                jQContext = jQuery(ele);
            params.jQContext = jQContext;
            if (jQContext.attr(YZKN_POSITION_ATTR)) {
                positionInfo = jQContext.attr(YZKN_POSITION_ATTR).split(':');                
            }
            var movementPresetAttr
            // Presets to define movement on the x,y, and z axis in the format of movementType:destinationNodeElementId
            // example: data-yzkn-xyz = "out:show-search-results;right:query"
            // The example node will focus to node with id show-search-results when moving out
            // and will focus to node with id query when moving right
            if (movementPresetAttr = jQContext.attr(YZKN_PRESET_XYZ_ATTR)) {
                // First break up each type of movement, e.g. out:show-search-results and right:query
                var movementPresets = movementPresetAttr.split(';'),
                    iNumMovementPresets = movementPresets.length,
                    iMovementPresetProperties
                params.xyzPresets = {}
                while (iNumMovementPresets--) {
                    // For each type of movement, break it down to movement name e.g. out
                    // and dom id of the node to focus to e.g. show-search-results
                    iMovementPresetProperties = movementPresets[iNumMovementPresets].split(':')
                    params.xyzPresets[iMovementPresetProperties[0]] = iMovementPresetProperties[1]
                }
            }
            if (parentSelectorsToNotifyOnFocus = jQContext.attr(YZKN_FOCUS_NOTIFY_SELECTORS_ATTR)) {
                params.parentSelectorsToNotifyOnFocus = parentSelectorsToNotifyOnFocus
            }
            if (params.row == undefined) {
                params.row = positionInfo[0] == 'auto' ? 'auto' : parseInt(positionInfo[0]);
            }
            if (params.col == undefined) {
                params.col = positionInfo[1] == 'auto' ? 'auto' : parseInt(positionInfo[1]);
            }
            if (params.isDefaultFocus == undefined) {
                 params.isDefaultFocus = jQContext.hasClass(YZKN_DEFAULT_FOCUS_CLASS);//false by default
            }
            if (params.passthrough == undefined) {
                params.passthrough = jQContext.hasClass(YZKN_PASSTHROUGH_CLASS);//False by default
            }
            if (params.groupNav == undefined) {
                params.groupNav = jQContext.hasClass(YZKN_GROUPNAV_CLASS)
            }
            //Solo nodes don't have any parent or siblings, so they can only be reached via
            //teleportation or child nodes
            if (params.isSoloNode == undefined) {
                params.isSoloNode = jQContext.hasClass(YZKN_IS_SOLO_CLASS);//False by default
            }
            if (params.parentNode == undefined) {
                params.parentNode = this.getNodeByDom(jQContext.parent().closest(YZKN_SELECTOR));
            }
            if (params.siblingNodesInfo == undefined) {
                //If parent node is set, then the siblings by default is the
                //children of the parent
                if (params.parentNode) {
                    if (!params.parentNode.childNodesInfo) {
                        params.parentNode.childNodesInfo = new yzKbNavNodesInfo();
                    }
                    params.siblingNodesInfo = params.parentNode.childNodesInfo
                } else if (params.isSoloNode) {
                    //If we are in solo node, then parent does not exist and there are no
                    //other siblings, so we set it to a new empty nodes info object that
                    //will not have any other nothing
                    params.siblingNodesInfo = new yzKbNavNodesInfo();
                } else {
                    //final fall back is for when there are no parents but we are also not in
                    //solo mode, in this case, the new node will be a top level node and will
                    //be siblings with other top level nodes
                    params.siblingNodesInfo = yzKbNavManager.topLevelNodesInfo
                } 
            }
            if (params.disabled == undefined) {
                params.disabled = jQContext.hasClass(YZKN_DISABLED_CLASS)
            }
            if (params.autoScrollDisabled == undefined) {
                params.autoScrollDisabled = jQContext.hasClass(YZKN_AUTO_SCROLL_DISABLED_CLASS)
            }
            if (params.pausedMvmtDirWhenInFocus == undefined) {
              var pausedMovementDirs;
              if (pausedMovementDirs = jQContext.attr(YZKN_FIELDMVT_ATTR)) {
                params.pausedMvmtDirWhenInFocus = pausedMovementDirs.split(';')
              }              
            }
            newNodeIdx = _collectionsCntr++
            params.id  = newNodeIdx
            if (params.nodeClass == undefined) {
                if (jQContext.is(':text, textarea, select')) {
                    nodeClass = yzKbFormFieldNavNode;
                } else {
                    nodeClass  = yzKbNavNode;                
                }                
            } else {
                nodeClass = params.nodeClass
            }

            //For form elements, stepping in, usually meaning pressing enter should return true
            //so that a form can be submitted, for all other elements, pressing enter should return
            //false
            if (jQContext.is('input, textarea, button')) {
                params.enterReturnVal = true
            } else {
                params.enterReturnVal = false
            }
            newNode = new nodeClass(params)
            _collections[newNodeIdx] =  newNode
            jQContext.data(YZKN_DATA_KEY, newNodeIdx)
            if (newNode.init) {
                newNode.init()                
            }
            return newNode;
        },
        
        /**
         * Gets the yzKbNavNode that is attached to the given DOM element
         *
         * @param DomElement ele
         *
         * @return yzKbNavNode
         **/
        getNodeByDom: function(ele) {
            var nodeCollectionIdx = jQuery(ele).data(YZKN_DATA_KEY);
            if (nodeCollectionIdx in _collections) {
                return _collections[nodeCollectionIdx];
            }
        },
        /**
         * Brings focus on new node object
         * 
         * @param yzKbNavNode
         */
        focusToNewNode : function(newNode, params) {
            if (!newNode) { return true}
            if (_currentFocusedNode) {
               if (_currentFocusedNode.id == newNode.id) { return true }
               _previouslyFocusedNode = _currentFocusedNode
               _currentFocusedNode.onUnfocus(newNode); 
            }
            _currentFocusedNode = newNode;
            _currentFocusedNode.onFocus(params);
            return true;
        },
        getCurrentFocusedNode : function() {
            return _currentFocusedNode
        },
        getPreviouslyFocusedNode: function() {
            return _previouslyFocusedNode
        },
        /**
         * Unregisters a node from being tracked by the nav manager usually called when the node is being deleted
         */
        unregisterNode : function(nodeId) {
            delete _collections[nodeId]
        },
        getNodeById: function(nodeId) {
            return _collections[nodeId]
        }
    }
}();
