/**
 * @author Kuu Miyazaki
 *
 * Copyright (C) 2012 SWFCrew Project.
 * This code is licensed under the zlib license. See LICENSE for details.
 */
(function(global) {

  var theatre = global.theatre;
  var mSWFCrew = theatre.crews.swf;
  var mHandlers = mSWFCrew.handlers;
  var mShapeUtils = mSWFCrew.utils.shape;
  var TextActor = mSWFCrew.actors.TextActor;
  var TextProp = mSWFCrew.props.TextProp;

  function generateGlyphEditTextDrawFunction(pActor, pParams) {
    var i, il, j, jl, tTextBounds = pActor.bounds,
        tCurrX = pActor.leftmargin, tXBounds,
        tString = pActor.text || '',
        tFont = pActor.font,
        tTwipsWidth = 0, tTwipsHeight = 0, tEMHeight = 0,
        tTextLines = new Array(), tYPadding = 0;

    tXBounds = tTextBounds.right - tTextBounds.left - pActor.leftmargin - pActor.rightmargin;

    var tDrawFunctions = new Array(), tPaddingList = new Array();

    for (i = 0, il = tString.length; i < il; i++) {
      var tCharCode = tString.charCodeAt(i),
          tFontInfo = tFont.lookupTable[tCharCode + ''];

      if (tCharCode === 10 || tCharCode === 13 || (tFontInfo && tCurrX + tFontInfo.advance > tXBounds)) {
        // new line
        tYPadding += (pActor.leading + pActor.fontheight);
        tTextLines.push({draws: tDrawFunctions, paddings: tPaddingList, height: pActor.fontheight, emHeight: tEMHeight});
        tTwipsWidth = Math.max(tTwipsWidth, tCurrX);
        tDrawFunctions = new Array();
        tPaddingList = new Array();
        tCurrX = pActor.leftmargin;
        tEMHeight = 0;
      }
      if (tCharCode === 10 || tCharCode === 13 || !tFontInfo) {
        continue;
      }
      var tShape = tFontInfo.shape;
      tShape.bounds = {left: 0, right: 1024,
        top: (tFont.ascent === 0 ? -1024 : -tFont.ascent),
        bottom: (tFont.descent === 0 ? 0 : tFont.descent)};
      tShape.fillStyles[0].color = pActor.textcolor;
      var tActualBounds = {left: 0, right: 0, top: 0, bottom: 0};
      var tDrawFunc = mShapeUtils.generateDrawFunction(null, tShape, tActualBounds);
      if (tActualBounds.bottom > tShape.bounds.bottom) {
        // The font's shape can exceed the EM square (1024 x 1024) downward.
        tShape.bounds.bottom = tActualBounds.bottom;
        tDrawFunc = mShapeUtils.generateDrawFunction(null, tShape);
      }
      tDrawFunctions.push(tDrawFunc);
      tPaddingList.push({x: tCurrX / 20, y: tYPadding / 20});
      tEMHeight = Math.max(tEMHeight, (tShape.bounds.bottom - tShape.bounds.top));
      tCurrX += tFontInfo.advance;
    }
    tTextLines.push({draws: tDrawFunctions, paddings: tPaddingList, height: pActor.fontheight, emHeight: tEMHeight});
    tTwipsWidth = Math.max(tTwipsWidth, tCurrX);
    tTwipsHeight = tYPadding + pActor.leading + pActor.fontheight;

    pParams.width = tTwipsWidth;
    pParams.height = tTwipsHeight;
    pParams.string = tString;

    return function (pData) {
        var tContext = pData.context;

        for (i = 0, il = tTextLines.length; i < il; i++) {
          var tDrawList = tTextLines[i].draws;
          var tPadding = tTextLines[i].paddings;
          var tFontScale = tTextLines[i].height / tTextLines[i].emHeight;
          //var tXScale = tTextLines[i].xScale;
          //var tYScale = tTextLines[i].yScale;
//console.log('tXScale=' + tXScale);
//console.log('tYScale=' + tYScale);
          this.drawingContext.save();
          this.drawingContext.scale(tFontScale, tFontScale);
          for (j = 0, jl = tDrawList.length; j < jl; j++) {
            tContext.save();
            tContext.translate(tPadding[j].x, tPadding[j].y);
//console.log('tContext.translate(', tPadding[j].x, tPadding[j].y, ');');
            tDrawList[j].call(this, pData);
            tContext.restore();
          }
          this.drawingContext.restore();
        }
      };
  }

  function generateDeviceEditTextDrawFunction(pActor, pParams) {
    var tColor = pActor.textcolor;
    var tStringList = pActor.text.split(/[\n\r]/g); // split lines
    var tRows = [];
    var tFont = pActor.font;
    var tFontString = (tFont.italic ? 'italic ' : '') + (tFont.bold ? 'bold ' : '') + pActor.fontheight + 'px ' + tFont.name;
    var tBounds = pActor.bounds;
    var tXPos = pActor.leftmargin, tYPos = 0, tWidth = tBounds.right - tBounds.left - pActor.leftmargin - pActor.rightmargin, tHeight = tBounds.bottom - tBounds.top;
    var tAlign = '\'left\'';

    if (pActor.align === 1) {
      tAlign = '\'right\'';
      tXPos += tWidth;
    } else if (pActor.align === 2) {
      tAlign = '\'center\'';
      tXPos += tWidth / 2;
    }

    for (var i = 0, il = tStringList.length; i < il; i++) {
      var tString = tStringList[i].replace(/(?!\\)'/, '\\\'');
      var tCode = [
        'var tContext = pData.context;',
        'var tTempCanvas = this.drawingCanvas;',
        'var tTempContext = this.drawingContext;',
        'tTempContext.save();',
        'tTempContext.setTransform(1, 0, 0, 1, 0, 0);',
        'tTempContext.clearRect(0, 0, tTempCanvas.width, tTempCanvas.height);',
        'tTempContext.restore();',
        'tTempContext.save();',
        'tTempContext.globalCompositeOperation = \'xor\';',
        'tTempContext.fillStyle = \'' + tColor.toString() + '\';',
        'tTempContext.font = \'' + tFontString + '\';',
        'tTempContext.textBaseline = \'top\';',
        'tTempContext.textAlign = ' + tAlign + ';',
        'tTempContext.fillText(\'' + tString + '\', ' + tXPos + ', ' + tYPos + ', ' + tWidth + ');',
        'tContext.drawImage(tTempCanvas, 0, 0);',
        'tTempContext.restore();'
      ];
      tRows.push(new Function('pData', tCode.join('\n')));
      tYPos += (pActor.leading + pActor.fontheight);
    }

    pParams.width = tWidth;
    pParams.height = tHeight;

    return function (pData) {
        for (i = 0, il = tRows.length; i < il; i++) {
          var tDrawFunc = tRows[i];
          tDrawFunc.call(this, pData);
        }
      };
  }

  /**
   * Handles SWF Texts (DefineEditText.)
   * @param {quickswf.Text} pText The Text to handle.
   */
  mHandlers['DefineEditText'] = function(pEditText) {
    var tDictionaryToActorMap = this.actorMap;
    var tFonts = this.swf.fonts;
    // Define TextProp
    var tTextPropClass = function BuiltinEditTextProp(pBackingContainer, pWidth, pHeight, pDeviceText) {
      this.base(pBackingContainer, pWidth, pHeight, pDeviceText);
      this.rebuildGlyph = true;
    }
    theatre.inherit(tTextPropClass, TextProp);
    var tProto = tTextPropClass.prototype;
    var tParams = new Object();
    if (!pEditText.font) {
      throw new Exception('No font info.');
    }
    var tDeviceText = !pEditText.useoutline;
    tProto.preDraw = function(pData) {
        if (this.rebuildGlyph && this.actor.text) {
          var tParams = new Object();
          if (tDeviceText) {
            tProto.draw = generateDeviceEditTextDrawFunction(this.actor, tParams);
          } else {
            tProto.draw = generateGlyphEditTextDrawFunction(this.actor, tParams);
          }
          this.rebuildGlyph = false;
        }
        var tWillDraw = TextProp.prototype.preDraw.call(this, pData);

/*
        var tBounds = this.actor.bounds;
        var tWidth  = tBounds.right  - tBounds.left;
        var tHeight = tBounds.bottom - tBounds.top;
        var tWidthDiff  = tParams.width  - tWidth;
        var tHeightDiff = tParams.height - tHeight;
        tBounds.left   -= tWidthDiff  / 2;
        tBounds.right  += tWidthDiff  / 2;
        tBounds.top    -= tHeightDiff / 2;
        tBounds.bottom += tHeightDiff / 2;
*/

        return tWillDraw;
      };
    var tBounds = pEditText.bounds;
    var tTwipsWidth  = tBounds.right  - tBounds.left;
    var tTwipsHeight = tBounds.bottom - tBounds.top;

    var tCanvas = tProto.drawingCanvas = global.document.createElement('canvas');
    tCanvas.width = ((tTwipsWidth / 20) >>> 0) || 1;
    tCanvas.height = ((tTwipsHeight / 20) >>> 0) || 1;
    //console.log('TextProp: Canvas size : w=' + tCanvas.width + ', h=' + tCanvas.height);

    var tContext = tProto.drawingContext = tCanvas.getContext('2d');
    tContext.lineCap = 'round';
    tContext.lineJoin = 'round';
    tContext.scale(0.05, 0.05);

    // Define TextActor
    var tMedia = this.swf.mediaLoader;
    var tTextActor = tDictionaryToActorMap[pEditText.id] = function BuiltinEditTextActor(pPlayer) {
      this.base(pPlayer);

      // Copy necesary data.
      if (pEditText.sjis && pEditText.initialtext) {
        this.text = tMedia.get('text', pEditText.initialtext);
      } else {
        this.text = pEditText.initialtext;
      }
      this.bounds = pEditText.bounds;
      this.leftmargin = pEditText.leftmargin;
      this.rightmargin = pEditText.rightmargin;
      this.align = pEditText.align;
      this.textcolor = pEditText.textcolor;
      this.fontheight = pEditText.fontheight;
      this.leading = pEditText.leading;
      this.font = tFonts[pEditText.font],
      this.isDeviceText = tDeviceText;

      // Creates Prop objects.
      var tTextProp = this.prop = new tTextPropClass(pPlayer.backingContainer, this.width, this.height); // TODO: This feels like a hack...
      this.addProp(tTextProp);

      // Sets up variable accessor methods.
      var tVarName = pEditText.variablename;
      if (tVarName) {
        this.varName = tVarName;
        this.on('enter', function () {
            var tThis = this;
            // Registers the accessor methods.
            this.parent.hookVariable(tVarName, function () {
console.log('getter called!!!');
                return tThis.text;
              }, 'getter');
            this.parent.hookVariable(tVarName, function (pValue) {
console.log('setter called!!!');
                // need some escape ?
                tThis.text = pValue;
                tTextProp.clearCache();
                tTextProp.rebuildGlyph = true;
                tThis.invalidate();
              }, 'setter');
          });
        this.on('leave', function () {
            // Unregisters the accessor methods.
            if (this.varName && this.parent) {
              this.parent.unhookVariable(this.varName);
            }
          });
      }
    };
    theatre.inherit(tTextActor, TextActor);
    tTextActor.prototype.bounds = pEditText.bounds;
  };

}(this));
