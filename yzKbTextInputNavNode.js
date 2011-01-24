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
 * Node for handling textfields and textareas.
**/
var yzKbTextInputNavNode = function(params){
    if (!params) { return }
    yzKbNavNode.apply(this, arguments)
    this.textInputOnKeyStrokeCallback
    this.focusOnStepIn = params.focusOnStepIn
    this.focusOnStepInWithPopulatedText = params.focusOnStepIn
    this.pausedMvmtDirWhenInFocus = params.pausedMvmtDirWhenInFocus || ['out']

}
yzKbTextInputNavNode.prototype = new yzKbNavNode
yzKbTextInputNavNode.prototype.constructor = yzKbTextInputNavNode

/**
 * When current input node is selected, typing any alpha numeric keys or pressing the 
 * step in key (by default the <ENTER> key) will bring the input item into focus so the
 * can type. When the item is in focus, the usual node navigation such as, move out,
 * moveXY, etc, is disabled in order to allow full use of the keyboard, e.g. being able to 
 * press backspace. Only when the user presses the cancel or tab key is node navigation 
 * reactivated
 **/
yzKbTextInputNavNode.prototype.onKeyStroke = function (keyPressEle) {
    var _this = this,
        keystrokeCallbackResults,
        keyCode = keyPressEle.keyCode,
        shiftKey = keyPressEle.shiftKey,
        initialPressedKey,
        direction,
        keyIsAlphaNumeric = (keyCode > 47 && keyCode < 91);
    if (this.textInputOnKeyStrokeCallback) {
        keystrokeCallbackResults = this.textInputOnKeyStrokeCallback(keyPressEle)
        if (keystrokeCallbackResults != undefined) { return keystrokeCallbackResults }
    }
    direction = this.keyCodeToDirection[keyCode]
    var directionIsDisabled = this.pausedMvmtDirWhenInFocus.indexOf(direction) > -1
    if (!direction || directionIsDisabled) {
      if (this.movementIsPaused()) {
          if (keyCode == this.cancelKeyCode) {
              this.unpauseMovement();
          } else {
              return
          }
      } else {
          if (keyIsAlphaNumeric || keyCode == this.stepInKeyCode || this.focusOnStepIn) {
              this.focusToInputCursor(keyCode, keyIsAlphaNumeric, shiftKey)
          }
      }
    }
    //Calling parent method
    return yzKbNavNode.prototype.onKeyStroke.call(this, keyPressEle);
}
yzKbTextInputNavNode.prototype.focusToInputCursor = function(keyCode, keyIsAlphaNumeric, shiftKey) {
    var _this = this
    setTimeout(function(){
        var numPausedMovementsWhenFocused = _this.pausedMvmtDirWhenInFocus.length,
            iDisabledMovementDirection;
        while (numPausedMovementsWhenFocused--) {
          iDisabledMovementDirection = _this.pausedMvmtDirWhenInFocus[numPausedMovementsWhenFocused]
          _this.pauseMovement(iDisabledMovementDirection)
        }
        if (keyIsAlphaNumeric) {
            initialPressedKey = String.fromCharCode(keyCode);
            if (shiftKey) {
                _this._context.val(initialPressedKey.toUpperCase());
            } else {
                _this._context.val(initialPressedKey.toLowerCase())
            }
        }
        _this._context.focus();
        if (!keyIsAlphaNumeric) {
            _this._context.select();                    
        }
    }, 0);
}
/**
 * By default a the focus() jquery event is called on an node when it is being focused, for 
 * the next input node, the focus() event will be triggered only when the user starts typing 
 * or when he presses the enter key, so its not triggered in this method
**/
yzKbTextInputNavNode.prototype.onFocus = function(params) {
    var autoScrollOverride;
    if (this.onFocusCallback) {
        this.onFocusCallback(params);
    }
    if (this.focusOnStepIn) {
        this.focusToInputCursor()
    }
    if (this.focusOnStepInWithPopulatedText && this._context.val() != '') {
        if (this._context.val() != this._context.attr('placeholder')) {
            this.focusToInputCursor()
        }
    }
    this.notifyParentsOfFocus()
    this.centerNodeOnFocus(params)
    this._context.addClass(YZKN_ON_FOCUS_CLASS);
}