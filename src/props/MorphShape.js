/**
 * @author Jason Parrott
 *
 * Copyright (C) 2012 SWFCrew Project.
 * This code is licensed under the zlib license. See LICENSE for details.
 */
(function(global) {

  var theatre = global.theatre;
  var mProps = theatre.define('theatre.crews.swf.props');
  var mSWFCrew = theatre.crews.swf;

  var QuickSWFRect = quickswf.structs.RECT;
  var QuickSWFFillStyle = quickswf.structs.FILLSTYLE;
  var QuickSWFLineStyle = quickswf.structs.LINESTYLE;
  var QuickSWFMatrix = quickswf.structs.MATRIX;
  var QuickSWFRGBA = quickswf.structs.RGBA;
  var QuickSWFGradient = quickswf.structs.GRADIENT;
  var QuickSWFStop = quickswf.structs.Stop;
  var mShapeUtils = mSWFCrew.utils.shape;

  mProps.MorphShapeProp = MorphShapeProp;

  /**
   * @constructor
   */
  function MorphShapeProp(pBackingCanvas, pWidth, pHeight) {
    this.base(pBackingCanvas, pWidth, pHeight);
    this.cacheDrawResult = false;
    this.cacheWithClass = false;
  }
  theatre.inherit(MorphShapeProp, mProps.ShapeProp);

  function convertStyle(pMorphedStyle, pRatio) {
    if (pMorphedStyle.__proto__ === QuickSWFFillStyle.prototype) {
      return convertFillStyle(pMorphedStyle, pRatio);
    } else {
      return convertLineStyle(pMorphedStyle, pRatio);
    }
  }

  function convertFillStyle(pMorphedFillStyle, pRatio) {
    var j, jl;
    var tFillStyle;
    var tMorphedFillStyle;
    var tMatrix, tStartMatrix, tEndMatrix;
    var tColor, tStartColor, tEndColor;
    var tGradient, tMorphedGradient;
    var tStops, tMorphedStops;
    var tStop, tMorphedStop;

    tFillStyle = new QuickSWFFillStyle(false);
    tFillStyle.bitmapId = pMorphedFillStyle.bitmapId;
    tFillStyle.type = pMorphedFillStyle.type;

    if (pMorphedFillStyle.startMatrix !== null) {
      tMatrix = tFillStyle.matrix = new QuickSWFMatrix();
      tStartMatrix = pMorphedFillStyle.startMatrix;
      tEndMatrix = pMorphedFillStyle.endMatrix;
      for (j = 0; j < 6; j++) {
        tMatrix[j] = interpolate(tStartMatrix[j], tEndMatrix[j], pRatio);
      }
    }

    if (pMorphedFillStyle.startColor !== null) {
      tColor = tFillStyle.color = new QuickSWFRGBA();
      tStartColor = pMorphedFillStyle.startColor;
      tEndColor = pMorphedFillStyle.endColor;
      tColor.red = interpolate(tStartColor.red, tEndColor.red, pRatio) | 0;
      tColor.green = interpolate(tStartColor.green, tEndColor.green, pRatio) | 0;
      tColor.blue = interpolate(tStartColor.blue, tEndColor.blue, pRatio) | 0;
      tColor.alpha = interpolate(tStartColor.alpha, tEndColor.alpha, pRatio) | 0;
    }

    if (pMorphedFillStyle.gradient !== null) {
      tGradient = tFillStyle.gradient = new QuickSWFGradient();
      tMorphedGradient = pMorphedFillStyle.gradient;

      tGradient.spreadMode = tMorphedGradient.spreadMode;
      tGradient.interpolationMode = tMorphedGradient.interpolationMode;
      tGradient.focalPoint = tMorphedGradient.focalPoint;

      tStops = tGradient.stops;
      tMorphedStops = tMorphedGradient.stops;

      for (j = 0, jl = tMorphedStops.length; j < jl; j++) {
        tStop = tStops[j] = new QuickSWFStop();
        tMorphedStop = tMorphedStops[j];

        tStop.ratio = interpolate(tMorphedStop.startRatio, tMorphedStop.endRatio, pRatio);

        tColor = tStop.color = new QuickSWFRGBA();
        tStartColor = tMorphedStop.startColor;
        tEndColor = tMorphedStop.endColor;
        tColor.red = interpolate(tStartColor.red, tEndColor.red, pRatio) | 0;
        tColor.green = interpolate(tStartColor.green, tEndColor.green, pRatio) | 0;
        tColor.blue = interpolate(tStartColor.blue, tEndColor.blue, pRatio) | 0;
        tColor.alpha = interpolate(tStartColor.alpha, tEndColor.alpha, pRatio) | 0;
      }
    }

    return tFillStyle;
  }

  function convertLineStyle(pMorphedLineStyle, pRatio) {
    var tLineStyle, tMorphedLineStyle;
    var tColor, tStartColor, tEndColor;

    tLineStyle = new QuickSWFLineStyle(false);

    tLineStyle.width = pMorphedLineStyle.startWidth + (pMorphedLineStyle.endWidth - pMorphedLineStyle.startWidth) * pRatio;

    if (pMorphedLineStyle.startColor !== null) {
      tColor = tLineStyle.color = new QuickSWFRGBA();
      tStartColor = pMorphedLineStyle.startColor;
      tEndColor = pMorphedLineStyle.endColor;
      tColor.red = interpolate(tStartColor.red, tEndColor.red, pRatio) | 0;
      tColor.green = interpolate(tStartColor.green, tEndColor.green, pRatio) | 0;
      tColor.blue = interpolate(tStartColor.blue, tEndColor.blue, pRatio) | 0;
      tColor.alpha = interpolate(tStartColor.alpha, tEndColor.alpha, pRatio) | 0;
    }

    return tLineStyle;
  }

  MorphShapeProp.convertBounds = function(pMorphShape, pRatio) {
    var tStartBounds = pMorphShape.startBounds;
    var tEndBounds = pMorphShape.endBounds;
    var tBounds = new QuickSWFRect();
    tBounds.left = interpolate(tStartBounds.left, tEndBounds.left, pRatio);
    tBounds.top = interpolate(tStartBounds.top, tEndBounds.top, pRatio);
    tBounds.right = interpolate(tStartBounds.right, tEndBounds.right, pRatio);
    tBounds.bottom = interpolate(tStartBounds.bottom, tEndBounds.bottom, pRatio);

    return tBounds;
  };

  function interpolate(pStart, pEnd, pRatio) {
    return pStart + (pEnd - pStart) * pRatio;
  }

  MorphShapeProp.generateDrawFunction = function(pStartDrawables, pEndDrawables, pBounds, pImages, pRatio) {
    var tDrawablesLength = pStartDrawables.length;
    var tDrawables = new Array(tDrawablesLength);
    var tDrawable, tStartDrawable, tEndDrawable;
    var tStartPaths, tEndPaths;
    var tPath, tStartPath, tEndPath;
    var tRecords, tStartRecords, tEndRecords;
    var tRecordsLength;
    var tStartRecord, tEndRecord;
    var tStartType, tEndType;
    var tNewDeltaX, tNewDeltaY;
    var i, j, jl, k;

    for (i = 0; i < tDrawablesLength; i++) {
      tStartDrawable = pStartDrawables[i];
      tEndDrawable = pEndDrawables[i];

      tDrawable = tDrawables[i] = new tStartDrawable.constructor(convertStyle(tStartDrawable.style, pRatio));

      if (tEndDrawable === void 0) {
        console.error('MorphShape end drawable did not exist. Using start drawable.');
        tDrawable.paths = tStartDrawable.paths;
        continue;
      }

      tStartPaths = tStartDrawable.paths;
      tEndPaths = tEndDrawable.paths;

      for (j = 0, jl = tStartPaths.length; j < jl; j++) {
        tStartPath = tStartPaths[j];
        tEndPath = tEndPaths[j];

        if (tEndPath === void 0) {
          console.error('MorphShape end path did not exist. Using start path.');
          tPath = tStartPath;
          continue;
        }

        tPath = new tStartPath.constructor(
          interpolate(tStartPath.startX, tEndPath.startX, pRatio),
          interpolate(tStartPath.startY, tEndPath.startY, pRatio)
        );

        tDrawable.addPath(tPath);

        tStartRecords = tStartPath.records;
        tEndRecords = tEndPath.records;
        tRecordsLength = tStartRecords.length;

        tRecords = tPath.records = new Array(tRecordsLength);

        for (k = 0; k < tRecordsLength; k++) {
          tStartRecord = tStartRecords[k];
          tEndRecord = tEndRecords[k];

          if (tEndRecord === void 0) {
            tRecords[k] = tStartRecord;
            continue;
          }
          if (tStartRecord === void 0) {
            tRecords[k] = tStartRecord;
            continue;
          }

          tStartType = tStartRecord.type;
          tEndType = tEndRecord.type;

          if (tStartType === tEndType) {
            if (tStartType === 'quadraticCurve') {
              tRecords[k] = {
                type: tStartType,
                controlX: interpolate(tStartRecord.controlX, tEndRecord.controlX, pRatio),
                controlY: interpolate(tStartRecord.controlY, tEndRecord.controlY, pRatio),
                x: interpolate(tStartRecord.x, tEndRecord.x, pRatio),
                y: interpolate(tStartRecord.y, tEndRecord.y, pRatio)
              };
            } else if (tStartType === 'line') {
              tRecords[k] = {
                type: tStartType,
                x: interpolate(tStartRecord.x, tEndRecord.x, pRatio),
                y: interpolate(tStartRecord.y, tEndRecord.y, pRatio)
              };
            } else {
              tRecords[k] = tStartRecord;
            }
          } else if (tStartType === 'quadraticCurve') {
            // Convert end edge to a curve.
            tNewDeltaX = tEndRecord.x / 2;
            tNewDeltaY = tEndRecord.y / 2;
            tRecords[k] = {
              type: 'quadraticCurve',
              controlX: interpolate(tStartRecord.controlX, tNewDeltaX, pRatio),
              controlY: interpolate(tStartRecord.controlY, tNewDeltaY, pRatio),
              x: interpolate(tStartRecord.x, tNewDeltaX, pRatio),
              y: interpolate(tStartRecord.y, tNewDeltaY, pRatio)
            };
          } else if (tStartType === 'line') {
            // Convert start edge to a curve.
            tNewDeltaX = tStartRecord.x / 2;
            tNewDeltaY = tStartRecord.y / 2;
            tRecords[k] = {
              type: 'quadraticCurve',
              controlX: interpolate(tNewDeltaX, tEndRecord.controlX, pRatio),
              controlY: interpolate(tNewDeltaY, tEndRecord.controlY, pRatio),
              x: interpolate(tNewDeltaX, tEndRecord.x, pRatio),
              y: interpolate(tNewDeltaY, tEndRecord.y, pRatio)
            };
          } else {
            console.error('MorphShape records do not match. Using start records.');
            tRecords[k] = tStartRecord;
          }
        }
      }
    }

    return mShapeUtils.getShapeDrawFunction(tDrawables, pBounds, pImages);
  }

  MorphShapeProp.drawFunctions = {};

  var mPreDrawBackup = mProps.ShapeProp.prototype.preDraw;

  MorphShapeProp.prototype.preDraw = function(pData) {
    var tActor = this.actor;

    if (tActor.isVisible === false) {
      return false;
    }

    var tDrawFunctions = MorphShapeProp.drawFunctions;
    var tRatio = tActor.ratio;
    var tRatioString = tRatio + '';
    var tDrawFunction;
    var tMorphShape = this.morphShape;
    var tBounds = MorphShapeProp.convertBounds(tMorphShape, tRatio);

    tActor.bounds = tBounds;

    if (!(tRatioString in tDrawFunctions)) {
      tDrawFunction = tDrawFunctions[tRatioString] = MorphShapeProp.generateDrawFunction(
        tActor.startDrawables,
        tActor.endDrawables,
        tBounds,
        this.images,
        tRatio
      );
    } else {
      tDrawFunction = tDrawFunctions[tRatioString];
    }

    this.draw = tDrawFunction;

    return mPreDrawBackup.call(this, pData);
  }

}(this));
