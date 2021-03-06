/**
 * @author Jason Parrott
 *
 * Copyright (C) 2012 SWFCrew Project.
 * This code is licensed under the zlib license. See LICENSE for details.
 */
(function(global) {
  var mHandlers = global.theatre.crews.swf.ASHandlers;
  var utils = global.theatre.crews.swf.utils;

  mHandlers.GetTargetAndData = function(pPath, pCurrentTarget, pLastPartIsFrame) {
    var i;

    if (!pPath) {
      return {
        target: pCurrentTarget,
        step: 0,
        label: '',
        targetDepth: 0
      };
    }

    var tFramePartIndex = pPath.indexOf(':');
    var tFramePart;
    if (tFramePartIndex !== -1) {
      pLastPartIsFrame = true;
    }

    var tNewTarget = pCurrentTarget;
    var tStep = 0;
    var tLabel = '';
    var tParts = pPath.split(/:|\//);
    var tPartsLength = tParts.length;

    if (pLastPartIsFrame === true) {
      tFramePart = tParts[tPartsLength - 1];
      tPartsLength--;
    }

    if (tFramePart !== void 0) {
      var tTempStep = parseInt(tFramePart, 10);
      if (tTempStep + '' === tFramePart) {
        tStep = tTempStep - 1;
      } else {
        tLabel = tFramePart;
      }
    }

    if (tNewTarget === null) {
      console.warn('Target not found: Target="' + pPath + '" Base="' + this.getLastValidTarget().name + '"');
      return {
        target: null,
        step: tStep,
        label: tLabel,
        targetDepth: tPartsLength
      };
    }

    for (i = 0; i < tPartsLength; i++) {
      var tPart = tParts[i].toLowerCase();
      if (tPart === '.') {
        continue;
      } else if (tPart === '') {
        tNewTarget = tNewTarget.player.root; // Right?
      } else if (tPart === '..') {
        tNewTarget = tNewTarget.parent;
      } else if (tPart === '_root') {
        tNewTarget = tNewTarget.player.root; // Right?
      } else if (tPart.indexOf('_level') === 0) {
        tNewTarget = tNewTarget.player.root; // TODO: Implement this properly.
      } else {
        tNewTarget = tNewTarget.getActorByName(tPart);
      }
      if (tNewTarget === null) {
        console.warn('Target not found: Target="' + pPath + '" Base="' + this.getLastValidTarget().name + '"');
        return {
          target: null,
          step: tStep,
          label: tLabel,
          targetDepth: tPartsLength
        };
      }
    }

    return {
      target: tNewTarget,
      step: tStep,
      label: tLabel,
      targetDepth: tPartsLength
    };
  }

  mHandlers.NextFrame = function() {
    if (this.target === null) {
      return;
    }
    this.target.goto(this.target.currentStep + 1);
  };

  mHandlers.PreviousFrame = function() {
    if (this.target === null) {
      return;
    }
    this.target.goto(this.target.currentStep - 1);
  };

  mHandlers.Play = function() {
    if (this.target === null) {
      return;
    }
    this.target.startNextStep();
  };

  mHandlers.Stop = function() {
    if (this.target === null) {
      return;
    }
    this.target.stop();
  };

  mHandlers.GoToFrame = function(pFrame) {
    if (this.target === null) {
      return;
    }
    this.target.goto(pFrame) !== false || this.target.goto(0);
  };

  mHandlers.GoToLabel = function(pLabel) {
    if (this.target === null) {
      return;
    }
    this.target.gotoLabel(pLabel);
  };

  mHandlers.Trace = function(pMessage) {
    global.console.debug(pMessage);
  };

  mHandlers.Call = function(pFrame) {
    var tCurrentTarget = this.getLastValidTarget();

    var tData = this.callMapped('GetTargetAndData', pFrame, tCurrentTarget, true);

    if (tData.target === null) {
      console.warn('Target not found for Call: Target="' + pFrame + '" Base="' + this.getLastValidTarget().name + '"');
      return;
    } else {
      tCurrentTarget = tData.target;
    }

    if (tData.label !== '') {
      var tStep = tCurrentTarget.getLabelStep(tData.label);
      if (tStep !== null) {
        tCurrentTarget.doScripts(tStep, tCurrentTarget);
      } else {
        console.error('Label in Call() did not exist');
      }
    } else {
      tCurrentTarget.doScripts(tData.step, tCurrentTarget);
    }
  };

  mHandlers.GoToFrame2 = function(pFrame, pSceneBias, pPlayFlag) {
    var tCurrentTarget = this.target;
    var tResult;

    if (tCurrentTarget === null) {
      return;
    }

    if (typeof pFrame === 'number') {
      tCurrentTarget.goto((pFrame - 1) + pSceneBias) !== false || tCurrentTarget.goto(0);
      if (pPlayFlag === 1) {
        tCurrentTarget.startNextStep();
      } else {
        tCurrentTarget.stop();
      }
      return;
    }

    var tData = this.callMapped('GetTargetAndData', pFrame, tCurrentTarget, true);

    if (tData.target === null) {
      console.warn('Target not found for GoToFrame2: Target="' + pFrame + '" Base="' + this.getLastValidTarget().name + '"');
      return;
    }

    tCurrentTarget = tData.target;

    if (tData.label !== '') {
      tCurrentTarget.gotoLabel(tData.label); // TODO: Support bias?

      if (pPlayFlag === 1) {
        tCurrentTarget.startNextStep();
      } else {
        tCurrentTarget.stop();
      }
    } else {
      tCurrentTarget.goto((tData.step - 1) + pSceneBias);

      if (pPlayFlag === 1) {
        tCurrentTarget.startNextStep();
      } else {
        tCurrentTarget.stop();
      }
    }
  };

  mHandlers.SetVariable = function(pName, pValue) {
    var tLastValidTarget = this.getLastValidTarget();
    var tData = this.callMapped('GetTargetAndData', pName, tLastValidTarget, true);

    if (tData.target === null) {
      if (tData.targetDepth > 0) {
        return;
      }
    } else {
      tLastValidTarget = tData.target;
    }
    tLastValidTarget.setVariable(tData.label, pValue);
  };

  mHandlers.GetVariable = function(pName) {
    var tIsLength = false;

    if (/:length$/.test(pName) === true) {
      pName = pName.substr(0, pName.length - 7);
      tIsLength = true;
    }

    var tLastValidTarget = this.getLastValidTarget();
    var tData = this.callMapped('GetTargetAndData', pName, tLastValidTarget, true);
    var tValue;

    if (tData.target === null) {
      if (tData.targetDepth > 0) {
        return;
      }
    } else {
      tLastValidTarget = tData.target;
    }

    tValue = tLastValidTarget.getVariable(tData.label);

    if (tIsLength === true) {
      return tValue.length;
    }

    return tValue;
  };

  mHandlers.FSCommand2 = function(pName, pArgs) {
    console.debug('FSCommand2', pName, pArgs);
    return 0;
  };

  mHandlers.SetProperty = function(pName, pProperty, pValue) {
    var tTarget = this.callMapped('GetTargetAndData', pName, this.target).target;

    if (tTarget === null) {
      return;
    }

    var tMatrix;
    var tFloat;
    var tColorTransform;

    switch (pProperty) {
      case 0: // x
        tMatrix = tTarget.matrix;
        tTarget.isMatrixLocked = true;
        tMatrix.e = this.toFloat(pValue) * 20;
        tTarget.invalidate();
        break;
      case 1: // y
        tMatrix = tTarget.matrix;
        tTarget.isMatrixLocked = true;
        tMatrix.f = this.toFloat(pValue) * 20;
        tTarget.invalidate();
        break;
      case 2: // xscale
        tMatrix = tTarget.matrix;
        tTarget.isMatrixLocked = true;
        tMatrix.a = (tMatrix.a < 0 ? -1 : 1) * this.toFloat(pValue) / 100;
        tTarget.invalidate();
        break;
      case 3: // yscale
        tMatrix = tTarget.matrix;
        tTarget.isMatrixLocked = true;
        tMatrix.d = (tMatrix.d < 0 ? -1 : 1) * this.toFloat(pValue) / 100;
        tTarget.invalidate();
        break;
      case 4: // currentFrame
        tTarget.goto(this.toInt(pValue) - 1);
        break;
      case 5: // totalFrames
        console.warn('Set Property totalFrames.');
        break;
      case 6: // alpha
        tFloat = this.toFloat(pValue);

        if (tFloat < 0) {
          tFloat = 0;
        }

        tColorTransform = tTarget.colorTransform;
        if (tColorTransform === null) {
          tColorTransform = tTarget.colorTransform = new global.quickswf.structs.CXFORM();
        }
        tColorTransform.am = 1;
        tColorTransform.aa = (tFloat * 2.55) | 0;

        tTarget.invalidate();
        break;
      case 7: // visible
        tFloat = this.toFloat(pValue);
        if (tTarget.isVisible != tFloat) {
          tTarget.isVisible = tFloat ? true : false;
          tTarget.invalidate();
        }
        break;
      case 8: // width
        tMatrix = tTarget.matrix;
        tMatrix.a = (tMatrix.a < 0 ? -1 : 1) * this.toInt(pValue) / this.width;
        break;
      case 9: // height
        tMatrix = tTarget.matrix;
        tMatrix.d = (tMatrix.d < 0 ? -1 : 1) * this.toInt(pValue) / this.height;
        break;
      case 10: // rotation
        console.warn('Set Property ROTATION.');
        break;
      case 11: // target
        console.warn('Set Property target');
        break;
      case 12: // framesLoaded
        console.warn('Set Property framesLoaded');
        break;
      case 13: // name
        this.name = this.toString(pValue);
        break;
      case 14: // dropTarget
        console.warn('Set Property dropTarget');
        break;
      case 15: // url
        console.warn('Set Property url');
        break;
      case 16: // highQuality
        console.warn('Set Property highQuality');
        break;
      case 17: // focusRect
        console.warn('Set Property focusRect');
        break;
      case 18: // soundBufTime
        console.warn('Set Property soundBufTime');
        break;
      case 19: // quality
        console.warn('Set Property quality');
        break;
      case 20: // xmouse
        console.warn('Set Property xmouse');
        break;
      case 21: // ymouse
        console.warn('Set Property ymouse');
        break;
      default:
        console.warn('Attempt to get unknown property ' + pProperty + ' on ' + pName);
        break;
    }
  };

  mHandlers.GetProperty = function(pName, pProperty) {
    var tTarget = this.callMapped('GetTargetAndData', pName, this.target).target;

    if (tTarget === null) {
      return '';
    }

    var tResult;

    switch (pProperty) {
      case 0: // x
        return tTarget.matrix.e / 20;
      case 1: // y
        return tTarget.matrix.f / 20;
      case 2: // xscale
        tResult = tTarget.matrix.a * 100;
        if (tResult < 0) {
          tResult = -tResult;
        }
        return tResult;
      case 3: // yscale
        tResult = tTarget.matrix.d * 100;
        if (tResult < 0) {
          tResult = -tResult;
        }
        return tResult;
      case 4: // currentFrame
        return tTarget.currentStep + 1;
      case 5: // totalFrames
        return tTarget.numberOfSteps;
      case 6: // alpha
        if (tTarget.colorTransform !== null) {
          // TODO: Is alpha separate from color transform?
          return ((tTarget.colorTransform.am + tTarget.colorTransform.aa) / 2.55) | 0;
        } else {
          return 100;
        }
      case 7: // visible
        return tTarget.isVisible === true ? 1 : 0;
      case 8: // width
        // TODO: Use getSize() when done.
        return tTarget.width || 0;
      case 9: // height
        // TODO: Use getSize() when done.
        return tTarget.height || 0;
      case 10: // rotation
        console.warn('Get Property ROTATION.');
        return 0;
      case 11: // target
        if (tTarget.__isRoot === true) {
          return '/';
        }

        var tNames = [tTarget.name];
        // TODO: This loop is a hack until we track roots.
        while ((tTarget = tTarget.parent) !== null && !tTarget.__isRoot) {
          tNames.push(tTarget.name);
        }

        return '/' + tNames.reverse().join('/');
      case 12: // framesLoaded
        return tTarget.numberOfSteps;
      case 13: // name
        return tTarget.name;
      case 14: // dropTarget
        console.warn('Get property dropTarget encountered.');
        return '';
      case 15: // url
        console.warn('Get property url encountered.');
        return '';
      case 16: // highQuality
        return 1;
      case 17: // focusRect
        console.warn('Get property focusRect encountered.');
        return '';
      case 18: // soundBufTime
        console.warn('Get property soundBufTime encountered.');
        return 0;
      case 19: // quality
        console.warn('Get property quality encountered.');
        return 1;
      case 20: // xmouse
        console.warn('Get property xmouse encountered.');
        return 0;
      case 21: // ymouse
        console.warn('Get property ymouse encountered.');
        return 0;
      default:
        console.warn('Attempt to set unknown property ' + pProperty + ' on ' + pName + ' to ' + pValue);
        return '';
    }
  };

  mHandlers.CloneSprite = function(pNewName, pDepth, pOriginalName) {
    var tOriginal = this.callMapped('GetTargetAndData', pOriginalName, this.target).target;

    if (tOriginal === null) {
      console.warn('Could not find ' + pOriginalName + ' to clone.');
      return;
    }

    var tNewActor = new tOriginal.constructor(tOriginal.player);
    tNewActor.isNonTimeline = true;

    var tOriginalColorTransform = tOriginal.colorTransform;
    if (tOriginalColorTransform !== null) {
      var tColorTransform = tNewActor.colorTransform = new quickswf.structs.CXFORM();
      for (var k in tOriginalColorTransform) {
        tColorTransform[k] = tOriginalColorTransform[k];
      }
    }

    var tOriginalMatrix = tOriginal.matrix;
    var tMatrix = tNewActor.matrix;
    tMatrix.a = tOriginalMatrix.a;
    tMatrix.b = tOriginalMatrix.b;
    tMatrix.c = tOriginalMatrix.c;
    tMatrix.d = tOriginalMatrix.d;
    tMatrix.e = tOriginalMatrix.e;
    tMatrix.f = tOriginalMatrix.f;

    tNewActor.name = pNewName;

    var tOldActor = tOriginal.parent.getActorAtLayer(pDepth);

    if (tOldActor !== null) {
      tOldActor.leave();
    }

    tOriginal.parent.addActor(tNewActor, pDepth, true);
    tNewActor.invalidate();
  };

  mHandlers.RemoveSprite = function(pName) {
    var tTarget = this.callMapped('GetTargetAndData', pName, this.target).target;

    if (tTarget === null || tTarget.isNonTimeline === false) {
      return;
    }

    tTarget.leave();
  };

  mHandlers.StopSounds = function() {

  };

  mHandlers.StartDrag = function() {

  };

  mHandlers.StopDrag = function() {

  };

  mHandlers.WaitForFrame = function(pWaitCount, pSkipCount) {

  };

  mHandlers.WaitForFrame2 = function(pSkipCount) {

  };

  mHandlers.GetURL = function(pURL, pTarget) {

    var tWindow = null;

    // The coresponding API calls are:
    //        getURL({URL});
    //        getURL({URL}, {target});

    if (pTarget) {
      if ('frames' in global) {
        tWindow = global.frames[pTarget];
      }
    }
    if (!tWindow) {
      tWindow = global;
    }
    tWindow.location.href = pURL;
  };

  mHandlers.GetURL2 = function(pURL, pTarget, pSendVarsMethod, pLoadTargetFlag, pLoadVariablesFlag) {
//console.log('GetURL2: ', pURL, pTarget, pSendVarsMethod, pLoadTargetFlag, pLoadVariablesFlag);

    var tLastValidTarget = this.getLastValidTarget(), 
        tUrl, tWindow, tOptions, tDelay, tSelf = this;

    // The coresponding API calls are:
    //        getURL({URL}, {target}, "GET");
    //        getURL({URL}, {target}, "POST");
    //        loadVariables({URL}, {target});
    //        loadVariables({URL}, {target}, "GET");
    //        loadVariables({URL}, {target}, "POST");
    //        loadMovie({URL}, {target});
    //        loadMovie({URL}, {target}, "GET");
    //        loadMovie({URL}, {target}, "POST");


    // We don't use Ajax for getURL({URL}, {target}, "GET");
    if (!pLoadTargetFlag && pSendVarsMethod !== 2) {

      tUrl = utils.ajax.buildURL(pURL, tLastValidTarget.getAllVariables());

      if (pTarget) {
        if ('frames' in global) {
          tWindow = global.frames[pTarget];
        }
      }
      if (!tWindow) {
        tWindow = global;
      }
      tWindow.location.href = tUrl;
      return;
    }

    // In other cases, make an Ajax request.
    if (pSendVarsMethod === 0) {
      // Don't send any data.
      tDelay = utils.ajax.get(pURL, tOptions);
    } else if (pSendVarsMethod === 1) {
      // Send the variables in the current movie clip via GET.
      tOptions = {
          queryData: tLastValidTarget.getAllVariables()
        };
      tDelay = utils.ajax.get(pURL, tOptions);
    } else {
      // Send the variables in the current movie clip via POST.
      tOptions = {
          queryData: tLastValidTarget.getAllVariables()
        };
      tDelay = utils.ajax.post(pURL, tOptions);
    }

    // Process the response.
    tDelay.on('success', function (pMessage) {
      var tResponse = pMessage.data,
          tData, tTarget, tQueryStrings;

      if (pLoadTargetFlag) {
        // pTarget is a path to a sprite. The path can be in slash or dot syntax. 
        tData = tSelf.callMapped('GetTargetAndData', pTarget, tLastValidTarget, true);
        tTarget = tData.target;
        if (pLoadVariablesFlag) {
          // The response is variables
          tQueryStrings = tResponse.responseText.split('&');
          for (var i = 0, il = tQueryStrings.length; i < il; i++) {
            var tKeyValuePair = tQueryStrings[i].split('=');
            tTarget.setVariable(tKeyValuePair[0], tKeyValuePair[1]);
          }
        } else {
          // The response is SWF
          // TODO: Merge assets in the SWF file into the target.
          console.log('The response is SWF.');
        }
      } else {
        // The target is a browser window.
        if (pTarget) {
          if ('frames' in global) {
            tWindow = global.frames[pTarget];
          }
        }
        if (!tWindow) {
          tWindow = global;
        }
        tWindow.document.body.innerHTML = tResponse.responseText;
      }
    });
    tDelay.on('error', function (pMessage) {
      // An error occurred. Nop.
      console.log('GetURL2: Ajax failed:', pMessage.data);
    });

  };

  mHandlers.SetLiteralTable = function(pType, pTable) {
    this.literalTables[pType + ''] = pTable;
  };

  mHandlers.GetLiteral = function(pType, pReader) {
    var tTable, tValue;

    if ((tTable = this.literalTables[pType + '']) === void 0) {
      return null;
    }

    switch (pType) {
    case 255: // Multibyte string
      var tLength = pReader.sl();;
      var tUint8Array = pReader.sub(pReader.tell(), tLength);
      var tBase64String = global.btoa(global.String.fromCharCode.apply(null, tUint8Array));
      pReader.seek(tLength + 1);
      tValue = tTable.get('text', tBase64String);
    }
    return tValue || null;
  };

}(this));
