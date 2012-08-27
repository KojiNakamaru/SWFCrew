(function(global) {

  var theatre = global.theatre;

  var mActors = theatre.define('theatre.crews.swf.actors');
  var mSWFCrew = theatre.crews.swf;
  var mHandlers = mSWFCrew.handlers = mSWFCrew.handlers || new Array();


  /**
   * Initializer used for all types of shapes.
   * @private
   */
  function initializer(pOptions, pStage, pLayer, pParent, pName) {
    this.width = this.twipsWidth / 20;
    this.height = this.twipsHeight / 20;
  }

  /**
   * Generates a new function for drawing a given shape.
   * @private
   */
  function generateDrawFunction(pSWF, pShape) {
    var tBounds = pShape.bounds;
    var tWidth = (tBounds.right - tBounds.left) / 20 + 1;
    var tHeight = (tBounds.bottom - tBounds.top) / 20 + 1;
    // TODO: Account for the very small offset created by this scale.

    var tCode = [
      'var tTempCanvas = document.createElement(\'canvas\');',
      'tTempCanvas.width = ' + tWidth + ';',
      'tTempCanvas.height = ' + tHeight + ';',
      'var tTempContext = tTempCanvas.getContext(\'2d\');',
      'tTempContext.lineCap = \'round\';',
      'tTempContext.lineJoin = \'round\';',
      'tTempContext.scale(.05, .05);',
      'tTempContext.translate(' + -tBounds.left + ',' + -tBounds.top + ');'
    ];

    var i, il, k, kl;

    var tFillStyles = pShape.fillStyles;
    var tLineStyles = pShape.lineStyles;

    var tFillEdges, tLineEdges;

    function populateFillBuffers() {
      tFillEdges = new Array(tFillStyles.length + 1);
      for (var i = 0, il = tFillEdges.length; i < il; i++) {
        tFillEdges[i + 1] = new Object();
      }
    }

    function populateLineBuffers() {
      tLineEdges = new Array(tLineStyles.length + 1);
      for (var i = 0, il = tLineEdges.length; i < il; i++) {
        tLineEdges[i + 1] = new Object();
      }
    }

    var tCurrentFillEdges0;
    var tCurrentFillEdges1;
    var tCurrentLineEdges;

    populateFillBuffers();
    populateLineBuffers();

    var tCurrentFillStyle0 = null;
    var tCurrentFillStyle1 = null;
    var tCurrentLineStyle = null;

    function flush(pType, pAllPoints, pStyles) {
      var tFinalPointX = 0;
      var tFinalPointY = 0;
      var tPoints;
      var tPoint;

      /**
       * Finds the next edge to connect to for this shape.
       * @param {Object} pEdge The edge to search from.
       * @param {Boolean} pAIfTrue Which side of the edge to search from.
       *  Sorry, needs to be a bool for performance.
       * @private
       */
      function findNext(pEdge, pAIfTrue) {
        var tAorB = pAIfTrue === true ? 'a' : 'b';

        var tEdgeCompareX;
        var tEdgeCompareY;

        if (pAIfTrue === true) {
          tEdgeCompareX = pEdge.px;
          tEdgeCompareY = pEdge.py;
        } else {
          tEdgeCompareX = pEdge.x;
          tEdgeCompareY = pEdge.y;
        }

        var tNextPoint = tPoints[pEdge[tAorB]];
        var tNextPointEdgesLength;

        if (tNextPoint === void 0 || (tNextPointEdgesLength = tNextPoint.length) === 1) {
          if (pType === 'line') {
            tCode.push('tTempContext.stroke();');
          } else {
            console.warn('Encountered an unclosed shape! Forcing it closed!');
            tCode.push(
              'tTempContext.closePath();',
              'tTempContext.fill();'
            );
          }
          if (tNextPoint !== void 0) {
            // Remove the base edge as we already used it.
            var tIndex = tNextPoint.indexOf(pEdge);
            if (tIndex !== -1) {
              tNextPoint.splice(tIndex, 1);
              delete tPoints[pEdge[tAorB]];
            }
          }
          return;
        }

        // Remove the base edge as we already used it.
        var tIndex = tNextPoint.indexOf(pEdge);
        if (tIndex === -1) console.error('Could not find edge that has to be there. Error with algorithm!');
        tNextPoint.splice(tIndex, 1);

        for (var i = 0; i < tNextPointEdgesLength; i++) {
          var tNextEdge = tNextPoint[i];
          var tEdgeType = tNextEdge.type;

          // We used this edge, remove it.
          tNextPoint.splice(i, 1);

          if (tNextPointEdgesLength === 2) {
            // We use 2 because we calculated this before.
            // If there are not more edges on this point
            // there would have been 2 edges when we started
            // this function. Meaning we now have 0.
            delete tPoints[pEdge[pAIfTrue === true ? 'a' : 'b']];
          }

          // Next we try to figure out which data (a or b) to use.
          if (tEdgeCompareX === tNextEdge.x && tEdgeCompareY === tNextEdge.y) {
            // We use a.

            // Draw the current edge.
            if (tEdgeType === 2) { // Curve
              tCode.push('tTempContext.quadraticCurveTo(' + tNextEdge.controlX + ', ' + tNextEdge.controlY + ', ' + tNextEdge.px + ', ' + tNextEdge.py + ');');
            } else if (tEdgeType === 3) { // Straight
              tCode.push('tTempContext.lineTo(' + tNextEdge.px + ', ' + tNextEdge.py + ');');
            }

            // Check if have completed a shape.
            if (tFinalPointX === tNextEdge.px && tFinalPointY === tNextEdge.py) {
              // We have completed a shape!
              if (pType === 'line') {
                tCode.push('tTempContext.stroke();');
              } else {
                tCode.push(
                  'tTempContext.fill();'
                );
              }

              // Clean things up as we have now used this edge.
              var tIndex = tPoint.indexOf(tNextEdge);
              if (tIndex === -1) {
                console.error('Major error in shape algorithm. Last edge is not in first point array.');
              }
              tPoint.splice(tIndex, 1);

              if (tPoint.length === 0) {
                delete tPoints[tNextEdge.a];
              }
              return;
            } else {
              findNext(tNextEdge, true);
            }
          } else {
            // We use b.
            
            // Draw the current edge.
            if (tEdgeType === 2) { // Curve
              tCode.push('tTempContext.quadraticCurveTo(' + tNextEdge.controlX + ', ' + tNextEdge.controlY + ', ' + tNextEdge.x + ', ' + tNextEdge.y + ');');
            } else if (tEdgeType === 3) { // Straight
              tCode.push('tTempContext.lineTo(' + tNextEdge.x + ', ' + tNextEdge.y + ');');
            }

            // Check if have completed a shape.
            if (tFinalPointX === tNextEdge.x && tFinalPointY === tNextEdge.y) {
              // We have completed a shape!
              if (pType === 'line') {
                tCode.push('tTempContext.stroke();');
              } else {
                tCode.push(
                  'tTempContext.fill();'
                );
              }

              // Clean things up as we have now used this edge.
              var tIndex = tPoint.indexOf(tNextEdge);
              if (tIndex === -1) {
                console.error('Major error in shape algorithm. Last edge is not in first point array.');
              }
              tPoint.splice(tIndex, 1);

              if (tPoint.length === 0) {
                delete tPoints[tNextEdge.b];
              }
              return;
            } else {
              findNext(tNextEdge, false);
            }

          }

          break; // TODO: Need to choose which edge is the CORRECT one. Right now we just choose the first.
        }
      }


      for (var i = 1, il = pAllPoints.length; i < il; i++) {
        tPoints = pAllPoints[i];

        if (Object.keys(tPoints).length === 0) continue;

        var tStyle = 'rgba(255,0,0,1)';
        var tStyleData = pStyles[i - 1];
        if (tStyleData.color) {
          tStyle = tStyleData.color.toString();
        }

        tCode.push(
          pType !== 'line' ? 'tTempContext.globalCompositeOperation = \'xor\';' : '',
          'tTempContext.clearRect(0, 0, ' + tWidth * 20 + ', ' + tHeight * 20 + ');',
          'tTempContext.' + (pType === 'line' ? 'stroke' : pType) + 'Style = "' + tStyle + '";',
          pType === 'line' ? 'tTempContext.lineWidth = ' + tStyleData.width + ';' : ''
        );
    
        tFinalPointX = 0;
        tFinalPointY = 0;

        // Go through all the points (each key is a string point of (x,y)).
        while (Object.keys(tPoints).length > 0) {
          for (var k in tPoints) {
            var tEdgeMain;
            var tEdgeType;

            tPoint = tPoints[k];
            // Every point needs at least 2 edges attached to it.
            if (tPoint.length === 1) {
              tEdgeMain = tPoint[0];

              if (pType === 'line') {
                tEdgeType = tEdgeMain.type;

                tCode.push(
                  'tTempContext.beginPath();',
                  'tTempContext.moveTo(' + tEdgeMain.px + ', ' + tEdgeMain.py + ');'
                );

                if (tEdgeType === 2) { // Curve
                  tCode.push('tTempContext.quadraticCurveTo(' + tEdgeMain.controlX + ', ' + tEdgeMain.controlY + ', ' + tEdgeMain.x + ', ' + tEdgeMain.y + ');');
                } else if (tEdgeType === 3) { // Straight
                  tCode.push('tTempContext.lineTo(' + tEdgeMain.x + ', ' + tEdgeMain.y + ');');
                }

                tCode.push('tTempContext.stroke();');
              } else {
                console.warn(k + ' does not have anything connecting to it!');
              }

              tPoint = tPoints[tEdgeMain.a];
              if (tPoint !== void 0) {
                tPoint.splice(tPoint.indexOf(tEdgeMain), 1);
                if (tPoint.length === 0) {
                  delete tPoints[tEdgeMain.a];
                }
              }
              tPoint = tPoints[tEdgeMain.b];
              if (tPoint !== void 0) {
                tPoint.splice(tPoint.indexOf(tEdgeMain), 1);
                if (tPoint.length === 0) {
                  delete tPoints[tEdgeMain.b];
                }
              }

              continue;
            }

            // Grab the first edge of this point. We use it as our starting edge.
            // Also remove it as have used it now.
            tEdgeMain = tPoint.shift();

            // These are the actual numerical points we are searching for.
            // Once another edge comes up that has these points, it means
            // we have found a full shape, and we close that shape and draw it.
            tFinalPointX = tEdgeMain.px;
            tFinalPointY = tEdgeMain.py;

            tEdgeType = tEdgeMain.type;

            tCode.push(
              'tTempContext.beginPath();',
              'tTempContext.moveTo(' + tEdgeMain.px + ', ' + tEdgeMain.py + ');'
            );

            if (tEdgeType === 2) { // Curve
              tCode.push('tTempContext.quadraticCurveTo(' + tEdgeMain.controlX + ', ' + tEdgeMain.controlY + ', ' + tEdgeMain.x + ', ' + tEdgeMain.y + ');');
            } else if (tEdgeType === 3) { // Straight
              tCode.push('tTempContext.lineTo(' + tEdgeMain.x + ', ' + tEdgeMain.y + ');');
            }

            // Start searching from the b point of the edge.
            findNext(tEdgeMain, false);
          }

          tCode.push(
            'pContext.scale(20, 20);',
            'pContext.drawImage(tTempContext.canvas, ' + tBounds.left / 20 + ', ' + tBounds.top / 20 + ');',
            'pContext.scale(.05, .05);'
          );
        }
      }
    }

    var tRecords = pShape.records;

    var tX = 0;
    var tY = 0;
    var tPreviousX = 0;
    var tPreviousY = 0;

    function add(pEdge, pArray) {
      if (pArray[pEdge.a] === void 0) {
        pArray[pEdge.a] = [pEdge];
      } else {
        pArray[pEdge.a].push(pEdge);
      }

      if (pArray[pEdge.b] === void 0) {
        pArray[pEdge.b] = [pEdge];
      } else {
        pArray[pEdge.b].push(pEdge);
      }
    }

    for (i = 0, il = tRecords.length; i < il; i++) {
      var tRecord = tRecords[i];
      var tType = tRecord.type;
      tPreviousX = tX;
      tPreviousY = tY;
      var tNewData;

      if (tType === 2) { // Curve
        tNewData = {
          type: tType,
          controlX: tX += tRecord.deltaControlX,
          controlY: tY += tRecord.deltaControlY,
          x: tX += tRecord.deltaX,
          y: tY += tRecord.deltaY,
          px: tPreviousX,
          py: tPreviousY,
          a: tPreviousX + ',' + tPreviousY,
          b: tX + ',' + tY
        };

        if (tCurrentFillStyle0 > 0) {
          add(tNewData, tCurrentFillEdges0);
        }

        if (tCurrentFillStyle1 > 0) {
          add(tNewData, tCurrentFillEdges1);
        }

        if (tCurrentLineStyle > 0) {
          add(tNewData, tCurrentLineEdges);
        }
      } else if (tType === 3) { // Straight
        tNewData = {
          type: tType,
          x: tX += tRecord.deltaX,
          y: tY += tRecord.deltaY,
          px: tPreviousX,
          py: tPreviousY,
          a: tPreviousX + ',' + tPreviousY,
          b: tX + ',' + tY
        };

        if (tCurrentFillStyle0 > 0) {
          add(tNewData, tCurrentFillEdges0);
        }

        if (tCurrentFillStyle1 > 0) {
          add(tNewData, tCurrentFillEdges1);
        }

        if (tCurrentLineStyle > 0) {
          add(tNewData, tCurrentLineEdges);
        }
      } else if (tType === 1) { // Change
        if (tRecord.fillStyles !== null) {
          flush('fill', tFillEdges, tFillStyles);
          tFillStyles = tRecord.fillStyles;
          populateFillBuffers();
        }

        if (tRecord.lineStyles !== null) {
          flush('line', tLineEdges, tLineStyles);
          tLineStyles = tRecord.lineStyles;
          populateLineBuffers();
        }

        if (tRecord.fillStyle0 > -1) {
          tCurrentFillStyle0 = tRecord.fillStyle0;
          tCurrentFillEdges0 = tFillEdges[tCurrentFillStyle0];
        }

        if (tRecord.fillStyle1 > -1) {
          tCurrentFillStyle1 = tRecord.fillStyle1;
          tCurrentFillEdges1 = tFillEdges[tCurrentFillStyle1];
        }

        if (tRecord.lineStyle > -1) {
          tCurrentLineStyle = tRecord.lineStyle;
          tCurrentLineEdges = tLineEdges[tCurrentLineStyle];
        }

        if (tRecord.hasMove === true) {
          tX = tRecord.moveDeltaX;
          tY = tRecord.moveDeltaY;
        }
      }
    }

    flush('fill', tFillEdges, tFillStyles);
    flush('line', tLineEdges, tLineStyles);

    var tFunction = eval('(function(pContext) {\n' + tCode.join('\n') + '\n})');

    return tFunction;
  }

  /**
   * Handles SWF Shapes.
   * The 2 is the displayList code for shapes in QuickSWF.
   * @param {quickswf.SWF} pSWF The SWF file.
   * @param {Object.<String, theatre.Actor>} pDictionaryToActorMap A map holding mappings for dictionary objects to Actor classes.
   * @param {quickswf.Sprite} pSprite The Shape to handle.
   * @param {Object} pOptions Options to customize things.
   */
  mHandlers[2] = function(pSWF, pDictionaryToActorMap, pShape, pOptions) {
    var tActions = mSWFCrew.actions;
    var tShapeActor = pDictionaryToActorMap[pShape.id] = theatre.createActor(
      'Shape_' + pShape.id,
      theatre.crews.canvas.CanvasActor,
      initializer
    );
    
    var tProto = tShapeActor.prototype;

    tProto.draw = generateDrawFunction(pSWF, pShape);

    tProto.twipsWidth = pShape.bounds.right - pShape.bounds.left;
    tProto.twipsHeight = pShape.bounds.bottom - pShape.bounds.top;
  };

}(this));