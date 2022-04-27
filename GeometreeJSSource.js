/* SRC Javascript for Geometree (http://www.geometreeproject.com/)
 * A tool/toy for tree creation using lsystems.
 * 
 * 
 * Code compiled using npm and webpack. 
 * Thanks to nikpundik for his helpful boilerplate:
 * https://github.com/nikpundik/threejs-starter-npm
 */



import * as THREE from 'three-full';
import { OrbitControls } from 'three-full'
import { Line2 } from 'three-full';
import { LineMaterial } from 'three-full';
import { LineGeometry } from 'three-full';
import * as math from 'mathjs';
import * as DAT from 'dat.gui';
import { RGBELoader } from 'three-full';
import { OBJExporter } from 'three-full';

//Scene variables
var camera, controls, renderer, line, scene;

//Material Indices
var lineMats = [];
var geoMats = [];
var matLine;
var lineMatIndices;
var numLevels= 1;

//Geometry Info
var geo_info, svg_points;

//Tree Height and Camera FOV for positioning
var height, fov;

//OBJ exporting
var objCount = 0;

//Cylinder Geometry
var widths= [];
var cylinderW = 1;
var wRatio = true;
var contraction = false;

//Leaf origin and orientation
var leafInfo = [];
var leafsOn = true;
var leafType = 0;
var leafSize = 3;

//Rotations
var turnChange = 0;
var pitchChange  = 0;
var roll1Change  = 0;
var roll2Change  = 0;
var roll3Change  = 0;


var lengthChanges = [1, 1];
var lengthChange = 0;

var width = 0.5;
var widthChange = 0.7;

var tropism = false;
var tropismX = -0.61;
var tropismY = 0.77;
var tropismZ = -0.19;
var tropismIntensity = 0.022;

//Template Dictionary for lookup of pre-set values
//Template Name -> 0:axiom, 1:rule set, 2:iterations, 3:trunk size, 4:l1_change, 5:l2_change, 6:turn, 7:pitch, 8:roll_1, 9:roll_2, 10:roll_3, 11:cylinder_width, 12:width_ratio, 13:contraction?
var templates = {
  "Fuzzy 2D":["X","F:FF;  X:{F-[[X]+X]+F[+FX]-X}, {F+[[X]-X]-F[-FX]+X}", 5, 1, 1, 1, 22.5, 0, 0, 0, 0, 0.5, 0.7, false],
  "Standard 2D":["X", "X:F[{-X}][{+X}]", 4, 10, 0.9, 0.9, 30, 30, 30, 30, 30, 2, 0.7, true],
  "Twiggy 2D":["X", "X:F{[+X][-X]}FX; F:FF", 5, 10, 0.9, 0.9, 30, 0, 0, 0, 0, 2.5, 0.7, false],
  "Pokey 2D":["X", "X:F{[+X]}F{[-X]}+X; F:FF", 6, 1, 1, 0.9, 25, 0, 0, 0, 0, 1.2, 0.7, false],
  "Seaweed Stalky 2D":["F", "F:F{[+F]}F{[-F]}F", 4, 1, 1, 1, 25, 0, 0, 0, 0, 0.5, 0.5, false],
  "Seaweed Loose 2D":["F", "F:F{[+F]}F{[-F][F]}", 4, 1, 0.9, 0.9, 25, 0, 0, 0, 0, 0.1, 0.8, false],
  "Seaweed Fuzzy 2D":["F", "F:FF-[{-F+F+F}]+[{+F-F-F}]", 4, 1, 0.9, 0.9, 25, 0, 0, 0,0, 0.5, 0.5, false],
  "Standard":["X", "X:F{[-X][+X][^X][vX][<X][>X]}", 5, 10, 0.9, 0.9, 30, 30, 30, 30, 30, 2, 0.5, true],
  "Fuzzy":["X","F:FF;  X:{F-v[[X]+^X]+^F[+^FX]-vX}, {F+v[[X]-^X]-^F[-^FX]+vX}, {F^>[[X]v<X]v<F[v<FX]^>X}, {Fv>[[X]^<X]^<F[^<FX]v>X}, {F<+[[X]>-X]>-F[>-FX]<+X}, {F>-[[X]<+X]<+F[<+FX]>=X}", 5, 1, 0.9, 0.9, 30, 30, 30, 30, 30, 0.5, 0.7, false],
  "Leaf Bush":["A", "A:*[vFl{A}]>>>>>[vFl{A}]>>>>>>>[vFl{A}]/; F:S>>>>>F; S:F^^lvv", 4, 10, 0.9, 0.9, 22.5, 22.5, 22.5, 22.5, 22.5, 1, 0.7, false],
  "Monopodial Tree 1":["A", "A:F[v{2B}2]>{1A}1; B:F[-${2C}2]{1C}1; C:{F[+${2B}2]{1B}1}", 10, 10, 0.9, 0.6, 45, 45, 137.5, 0, 0, 1, 0.75, true],
  "Monopodial Tree 2":["A", "A:F[v{2B}2]>{1A}1; B:F[-${2C}2]{1C}1; C:{F[+${2B}2]{1B}1}", 10, 10, 0.9, 0.8, 45, 45, 137.5, 0, 0, 1, 0.75, true],
  "Ternary Tree (WIP)":["F>3A", "A:F[v{2F}2A]>1[v{2F}2A]>2[v{2F}2A]", 4, 10, 1.109, 1, 0, 18.95, 94.74, 132.63, 45, 1, 1, false],
}

//Pre-Set colors
var palette = {
  "col_a":[115, 67, 0],
  "col_b": [27, 77, 0],
  "leaf_color":[0,255,0],
}

//Initial Line Mat
matLine = new LineMaterial( {
  color: (115, 67, 0),
  linewidth: 2, // in pixels
  vertexColors: false,
  //resolution to be set by renderer, eventually
  dashed: false

} );

//Main Function Calls
updateLineMats(1);
init();
animate();

/*  
 * Matrix and Transformation Functions
 * -----------------------------------
 */
//3x3 Rotation initialy used on 2D Geom
function rotMat3x3(angle){
  var theta = angle * (Math.PI /180.0);
  var c = math.cos(theta);
  var s = math.sin(theta);
  return [[c,-s, 0], [s, c, 0], [0,0,1]];
}

//Rotation using homogenous coordinates
function rotMat4(turn, pitch, roll){
  var theta = turn * (Math.PI/180.0);
  var turnMat = [[math.cos(theta),math.sin(theta), 0, 0], [ -math.sin(theta), math.cos(theta), 0, 0], [0,0, 1, 0], [0,0,0,1]];
  
  theta = pitch * (Math.PI/180.0);
  //var pitchMat = [[1,0,0,0],[0, math.cos(theta), -math.sin(theta), 0], [0,math.sin(theta), math.cos(theta), 0], [0,0,0,1]];
  var pitchMat =[[math.cos(theta), 0, -math.sin(theta), 0],[0,1,0,0],[math.sin(theta), 0, math.cos(theta), 0], [0,0,0,1]];

  theta = roll * (Math.PI/180.0);
  var  rollMat = [[1,0,0,0],[0, math.cos(theta), -math.sin(theta), 0], [0,math.sin(theta), math.cos(theta), 0], [0,0,0,1]];

  return math.multiply(turnMat, pitchMat, rollMat);
}

//3D Rotation without homogenous
function rotMat3(turn, pitch, roll){
  var theta = turn * (Math.PI/180.0);
  var turnMat = [[math.cos(theta),math.sin(theta), 0], [ -math.sin(theta), math.cos(theta), 0], [0,0, 1]];
  
  theta = pitch * (Math.PI/180.0);
  //var pitchMat = [[1,0,0,0],[0, math.cos(theta), -math.sin(theta), 0], [0,math.sin(theta), math.cos(theta), 0], [0,0,0,1]];
  var pitchMat =[[math.cos(theta), 0, -math.sin(theta)],[0,1,0],[math.sin(theta), 0, math.cos(theta)]];

  theta = roll * (Math.PI/180.0);
  var  rollMat = [[1,0,0],[0, math.cos(theta), -math.sin(theta)], [0,math.sin(theta), math.cos(theta)]];

  return math.multiply(turnMat, pitchMat, rollMat);
}

//Adds homogenous coords to 3x3
function addHomo(m){
  return [[m[0][0], m[0][1], m[0][2], 0], [m[1][0], m[1][1], m[1][2], 0], [m[2][0], m[2][1], m[2][2], 0], [0,0,0,1]];
}

//Scale and translation (with homogenous)
function transMat4(x, y, z){
  return [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0,0,0,1]];
}
function scaleMat4(x, y, z){
  return [[x, 0, 0, 0], [0, y, 0, 0], [0, 0, z, 0], [0,0,0,1]];
}

//Distance from p1 to p2 (for vector normalization)
function distance(p1, p2){
  return Math.sqrt(Math.pow(p1[0]-p2[0], 2)+Math.pow(p1[1]-p2[1], 2)+Math.pow(p1[2]-p2[2], 2));
}

//Rotation to vector using method from lecture
//Cannot be used for geometry
function rotToOrientation(orientation){

  orientation = math.transpose(orientation);
  var h = orientation[0];
  var l = orientation[1];
  var u = orientation[2];

  var rotate = [[-l[0], h[0], u[0]], [-l[1], h[1], u[1]], [-l[2], h[2], u[2]]];
  var r = rotate;
  return ([[r[0][0], r[0][1], r[0][2], 0],[r[1][0], r[1][1], r[1][2], 0], [r[2][0], r[2][1], r[2][2], 0], [0,0,0,1]]);
  
}

//Returns transformation info for one cylinder to follow p1 and p2
function branchMatrix(p1, p2){
  //Position for Scale
  var originToBottom = transMat4(0, 0.5, 0);
  
  //Scale
  var height = distance(p1, p2);
  var scale = scaleMat4(1, height, 1);

  var originToBScaled = transMat4(0, 0.5*height, 0);

  //Final Translation
  var trans = transMat4(p1[0], p1[1], p1[2]);
  
   return [math.multiply(scale, originToBottom),trans, math.subtract(p2, p1)];
}

//2D Trans
function transMat3x3(x, y){
  return [[1, 0, x], [0, 1, y], [0, 0, 1]];
}

//2D Mat * Vector
function apply3x3(m, v){
  var newVec = [];

  newVec[0] = math.dot(m[0], v);
  newVec[1] = math.dot(m[1], v);
  newVec[2] = math.dot(m[2], v);
  return newVec;
}

//3D Mat * Vector
function apply4x4(m, v){
    var newVec = [];
  
    newVec[0] = math.dot(m[0], v);
    newVec[1] = math.dot(m[1], v);
    newVec[2] = math.dot(m[2], v);
    newVec[3] = math.dot(m[3], v);
    return newVec;
}

//Removes Homogenous
function toThreeMat4(m){
  var mat =  new THREE.Matrix4();
  mat.set( m[0][0], m[0][1], m[0][2], m[0][3],
           m[1][0], m[1][1], m[1][2], m[1][3],
           m[2][0], m[2][1], m[2][2], m[2][3],
           m[3][0], m[3][1], m[3][2], m[3][3]);
  return mat;
}

//Expands l-system into full string given a set of rules and iterations
function expand_LSystem(axiom, rules, iterations){
  wRatio = true;

  var currentPath = axiom;

  for(var i = 0; i<iterations; i++){
    var newPath = "";
    for(var c = 0; c<currentPath.length; c++){
      if(currentPath[c] in rules){
        var defs = rules[currentPath[c]];

        //Random element from array
        var r = Math.floor(Math.random() * defs.length);

        //Add to string
        newPath+=defs[r];
      }
      else{
        newPath+=currentPath[c];
      }
    }
    currentPath = newPath;
  }

  return currentPath;
}


//Takes in L-System string plus other parameters and computes vertex positions, edge info, and levels for materials, lchange, and width
function generate(currentPath, trunk, angle){
  leafInfo = [];
  widths = [];
  width = 1; 
  lengthChange = lengthChanges[0];

  

  var verts = [];
  verts.push([0.0, 0.0, 0.0]);
  var edges = [];

  //Stack for saved position
  var savedPos = [];

  var currPos = [0.0,0.0,0,0,1.0];

  var H = [0,1,0];
  var L = [-1, 0, 0];
  var U = [0,0,1];
  var currOr = math.transpose([H, L, U]);

  var prevVertI = 0;
  var currVertI = 1;
  var prevVerts = [];

  var level = 0;
  var levels = [];
  numLevels = 0;

  for (var k = 0; k<currentPath.length; k++){
      var l = currentPath[k];
      var next;
      var nextP;
      if(k<currentPath.length-1){
        next = currentPath[k+1];
        nextP = parseInt(next);
      }
      else{
        next = "0";
        nextP = 0;
      }


      //Common Rules to save time
      if(l == "X"){continue;}
      else if(l == "A"){continue;}
      else if(l == "S"){continue;}

      //Denotes level change and looks for parameter indicator '1' or '2'
      else if(l == "{"){
        level = level+1;
        numLevels = Math.max(numLevels, level);
        
        if (nextP == 1 || nextP ==2){
          lengthChange = lengthChange*lengthChanges[next-1];
        }
        else{
          lengthChange = lengthChange*lengthChanges[0];
        }
        width = width * widthChange;
        
      }
      else if(l == "}"){
	level = level-1;
        if (nextP == 1 || nextP == 2){
          lengthChange = lengthChange/lengthChanges[next-1];
        }
        else{
          lengthChange = lengthChange/lengthChanges[0];
        }
        width = width/widthChange;
      }

      //Specifies Leaf
      else if(l == "l"){
        leafInfo.push([currPos,currOr]);
      }

      //Draw Forward
      else if(l == "F"){

        var rotToMatchH = rotToOrientation(currOr);

        
        var trans = math.multiply(math.multiply(transMat4(currPos[0], currPos[1], currPos[2]), rotToMatchH), transMat4(0, trunk*lengthChange, 0));
        var pos = apply4x4(trans, [0,0,0,1]);

        currPos = pos;
        
        //Homogenous Divide
        verts.push([currPos[0]/currPos[3], currPos[1]/currPos[3],currPos[2]/currPos[3]]);

        edges.push([prevVertI, currVertI]);
        prevVertI = currVertI;
        currVertI += 1;

        var currLevel = level;
        levels.push(currLevel);

        widths.push([width, width*widthChange]);
      }

      //Rotations
      else if(l == '+'){currOr = math.multiply(currOr, rotMat3(+turnChange, 0, 0));}
      else if(l == '-'){currOr = math.multiply(currOr, rotMat3(-turnChange, 0, 0));}
      else if(l == '^'){currOr = math.multiply(currOr, rotMat3(0, +pitchChange, 0));}
      else if(l == 'v'){currOr = math.multiply(currOr, rotMat3(0, -pitchChange, 0));}

      //Roll - 3 Possible Input Parameters
      else if(l == '<'){
        if(nextP == '2'){
          currOr = math.multiply(currOr, rotMat3(0,0,+roll2Change));
        }
        else if(nextP == '3'){
          currOr = math.multiply(currOr, rotMat3(0,0,+roll3Change));
        }
        else{
          currOr = math.multiply(currOr, rotMat3(0,0,+roll1Change));
        }
      }
      else if(l == '>'){        
        if(nextP == '2'){
          currOr = math.multiply(currOr, rotMat3(0,0,-roll2Change));
        }
        else if(nextP == '3'){
          currOr = math.multiply(currOr, rotMat3(0,0,-roll3Change));
        }
        else{
          currOr = math.multiply(currOr, rotMat3(0,0,-roll1Change));
        }
      }
      
      if(tropism){
        var t = [tropismX,tropismY,tropismZ];
        var e = tropismIntensity;
        var h = math.transpose(currOr)[0];
        h = math.divide(h, distance([0,0,0],h));
 

        var tA = e*distance([0,0,0],math.cross(h, t));
        var v = math.cross(math.cross(h, t), h);
        var toRad = 3.14/180;

        if( Math.sqrt(Math.pow(v[0], 2)+Math.pow(v[1], 2)+Math.pow(v[2], 2))!= 0){
          var T_tick = math.divide(v, Math.sqrt(Math.pow(v[0], 2)+Math.pow(v[1], 2)+Math.pow(v[2], 2)));

          var Z = math.add(math.multiply(Math.cos(tA), h),math.multiply(Math.sin(tA), T_tick));
          console.log(tA);
          
          currOr[0][0] = Z[0];
          currOr[1][0] = Z[1];
          currOr[2][0] = Z[2];  
          
        }
      }
      
      //Save and recover position and orientation
      if(l == '['){
          savedPos.push([currPos, currOr]);
          prevVerts.push(prevVertI);
      }
      if(l == ']'){
        var recover = savedPos.pop();
        currPos = recover[0];
        currOr = recover[1]
        prevVertI = prevVerts.pop();
      }

      //Special case for Monopodial Trees
      if(l == '$'){
        var H = math.transpose(currOr)[0];
        var V = [0,1,0];
        var L = math.divide(math.cross(V, H),distance([0,0,0], math.cross(V, H)));
        currOr = math.transpose([H, L, U]);
      }
  }

  lineMatIndices = numLevels+1;
  updateLineMats(lineMatIndices);
  return [verts, edges, levels];
}

//Takes in vertex and edge info and converts to point pairs for drawing lines 
function drawFromBuffers(geo_info, rep){
  var verts = geo_info[0];
  var edges = geo_info[1];
  var levels = geo_info[2];

  //Lighting Should be its own method - is recalculated here due to changing tree size
  var light = new THREE.AmbientLight( 0xc9e2ff, 1.5); // Soft Blue Ambient Light
  scene.add( light );

  var dLight = new THREE.DirectionalLight( 0xffedad, 2);//directional 'Sun" Light
  dLight.position.set(height/2, height*1.5, height/2);
  
  var targetObject = new THREE.Object3D();
  targetObject.position.set(0,height/2, 0);
  scene.add(targetObject);

  dLight.target = targetObject;
  scene.add(dLight);


  //Calculates svg points based on height
  //Calls proper mesh representation method
  svg_points = []
  for(var i = 0; i < edges.length; i++){
    var points = [];
    
    var vert1 = verts[edges[i][0]]
    var vert2 = verts[edges[i][1]]

      points.push(vert1[0],vert1[1], vert1[2]);
      points.push(vert2[0],vert2[1], vert2[2]);
      svg_points.push(vert1[0],vert1[1], vert2[0],vert2[1]);

    if (rep.localeCompare("Lines") == 0){
      drawLines(points);
    }
    else if (rep.localeCompare("Geo Lines") == 0){
      drawGeoLines(points, levels[i], widths[i]);
    }
    else if (rep.localeCompare("Geometree") == 0){
      
      drawGeometree(points,levels[i], widths[i]);
    
    }
    if(leafsOn && leafInfo.length>0){
      drawLeaves();
    }
    
  }

}

//Creates instantiated leaf planes or leaf points
function drawLeaves(){
  var c = palette.leaf_color;

  var l_color = new THREE.Color(c[0]/255, c[1]/255, c[2]/255);

  if(leafType == 0){
    var points = [];
    
    var material = new THREE.PointsMaterial( { color: l_color, size:leafSize } );
    for(var i = 0; i < leafInfo.length; i++){
      points.push(leafInfo[i][0][0], leafInfo[i][0][1]-(height/2), leafInfo[i][0][2]);
    }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( points, 3 ) );
      var leaf = new THREE.Points( geometry, material );
      scene.add(leaf);   
  }
  else if(leafType == 1){ 
    var material = new THREE.MeshStandardMaterial({ color: l_color, side: THREE.DoubleSide});
    var geometry = new THREE.PlaneGeometry(leafSize, leafSize);
    var leaf = new THREE.InstancedMesh( geometry, material, leafInfo.length ); 
    for(var i = 0; i < leafInfo.length; i++){
      var instance = new THREE.Object3D();
      instance.position.set(0,leafSize/2,0);

      
      var axis = new THREE.Vector3(0, 1, 0);
      var vector = new THREE.Vector3(leafInfo[i][1][0][0], leafInfo[i][1][1][0], leafInfo[i][1][2][0]);
      var pivot = new THREE.Object3D();

      pivot.name = name;
      pivot.add( instance );
      pivot.quaternion.setFromUnitVectors(axis, vector.clone().normalize());

      pivot.position.set(leafInfo[i][0][0], leafInfo[i][0][1]-(height/2), leafInfo[i][0][2]);
      pivot.updateMatrixWorld();
      instance.updateMatrixWorld();
      var matrix = instance.matrixWorld;

      leaf.setMatrixAt(i, matrix);
       
    }
    scene.add(leaf);
  }
}

//Combines all point pairs to one vector for drawLines
function pointPairToVec(positions){
  var pointVecs = []
  pointVecs.push( new THREE.Vector3( positions[0], positions[1], positions[2] ) );
  pointVecs.push( new THREE.Vector3( positions[3], positions[4], positions[5] ) );
  return(pointVecs);
}

//Simple Black Lines using Three.js class
function drawLines(positions){
    var pointVecs=pointPairToVec(positions);
    var geometry = new THREE.BufferGeometry().setFromPoints( pointVecs );
    var material = new THREE.LineBasicMaterial( { color: 0x000000 } );
    var line = new THREE.Line( geometry, material );
    scene.add(line); 
}

//Draws Fat Lines - extension of Three.js
function drawGeoLines(positions, level, ws){

  var colors = [];
  var color = new THREE.Color();
  colors.push( 0, 0, 0 );

  var geometry = new LineGeometry();
  geometry.setPositions( positions );
  geometry.setColors( colors );

  if(level < 0){
    level = 0;
  }
  else if(level>=lineMatIndices){
    level = lineMatIndices-1;
  }

  lineMats[level].linewidth = 5*ws[0];
  line = new Line2( geometry, lineMats[level] );
  scene.add(line);
}

function drawGeometree(positions, level, ws){


  //Find transformation info
  var matrixInfo = branchMatrix([positions[0], positions[1], positions[2]], [positions[3], positions[4], positions[5]]);
  
  //Add Cylinder
  if(contraction == true){
    var geometry = new THREE.CylinderGeometry( ws[1]*cylinderW, ws[0]*cylinderW,  1, 8 );
  }
  else if(contraction == false){
    var geometry = new THREE.CylinderGeometry( ws[0]*cylinderW, ws[0]*cylinderW,  1, 8 );
  }

  var material = new THREE.MeshStandardMaterial( {color: 0xaaaaaa, roughness: 0} )
  var cylinder = new THREE.Mesh( geometry, geoMats[level] );

  //Apply initial scale to cylinder, rotate pivot quaternion, and translate pivot
  cylinder.applyMatrix4(toThreeMat4(matrixInfo[0]));

  var axis = new THREE.Vector3(0, 1, 0);
  var vector = new THREE.Vector3(matrixInfo[2][0], matrixInfo[2][1], matrixInfo[2][2]);
  var pivot = new THREE.Object3D();

  //Cylinders are each added individually. If I were to re-implement I would instantiate the mesh for speedup.
  //My excuse is that cylinder width ratios could  be different. If this were the case I would create an array of meshes.
  pivot.name = name;
  pivot.add( cylinder );
  pivot.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
  pivot.applyMatrix4(toThreeMat4(matrixInfo[1]))
  scene.add( pivot );
}

//Shifts vertices -z by half of tree's height to center on world origin for easy orbiting
function shiftVertsDown(geo_info){
  height = 0;
  for(var i = geo_info[0].length-1; i>=0; i--){
    height = Math.max(geo_info[0][i][1], height); 
  }
  for(var i = geo_info[0].length-1; i>=0; i--){
    geo_info[0][i][1] -= (height/2);
  }
  return geo_info;
}

//Helper to call everything involved with drawing a new tree
function updateTree(path, trunk, angle, rep){

  //Clear Scene
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }
  geo_info = [];
  //Create geometry info
  geo_info = generate(path, trunk, angle);

  //Shift
  geo_info = shiftVertsDown(geo_info);
 
  //Draw
  drawFromBuffers(geo_info, rep);

  var dist = (height/2)/Math.tan((fov/2) *  Math.PI/180);
  camera.position.z = dist + dist*0.5;

  controls.update();
}

//Converts editable user input into dictionary 
function stringToRuleDict(s){
  var di = {};
  var buffer = ""
  var rule = ""
  var desc = []
  s = s.replace(/ /g,'');
  for(var i = 0; i<s.length; i++){
    if(s[i] == ':'){
      rule = buffer;
      buffer = "";
    }
    else if(s[i] == ','){
      var def = buffer;
      desc.push(def);
      buffer = "";
    }
    else if(s[i] == ';'){
      var def = buffer;
      desc.push(def);
      buffer = "";

      di[rule] = desc;
      desc = [];
    }
    else{
      buffer = buffer.concat(s[i]);
    }

    if(i == s.length-1){
      var def = buffer;
      desc.push(def);
      buffer = "";

      di[rule] = desc;
      desc = [];
    }
  }
  return di;
}


//Lerped Color
function chooseColor(fraction){
  var col1 = palette["col_a"];
  var col2 = palette["col_b"];
  var r = (col2[0]-col1[0])*fraction+col1[0];
  var g = (col2[1]-col1[1])*fraction+col1[1];
  var b = (col2[2]-col1[2])*fraction+col1[2];
  
  var col = new THREE.Color(r/255.0, g/255.0, b/255.0);
  return col;

}

//Called to create a new material stack - colors declared globally
function updateLineMats(indices){
  for(var i = 0; i<indices; i++){
    var col = chooseColor(i/indices);
    lineMats[i] = new LineMaterial( {
      color: col,
      //linewidth: 1, // in pixels
      vertexColors: false,
      //resolution to be set by renderer, eventually
      dashed: false
    
    } );
    geoMats[i] =  new THREE.MeshStandardMaterial( 
      {color: col, 
      roughness: 1} )
  }
}

//Main function
function init(){
  window.addEventListener( 'resize', onWindowResize, false );

  //Set Up Renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0xffffff, 0.0);
	renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );


  //Set Up Scene and Camera Orbit Controls
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );
  fov = 75;
  camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, 0.1, 1100 );
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = true;
  controls.maxDistance = 1000;
  controls.minDistance = 0;

  //Starting Params
  var params = {
    template:"Fuzzy 2D",
    axiom: templates["Fuzzy 2D"][0],
    rules:templates["Fuzzy 2D"][1], 
    iter: templates["Fuzzy 2D"][2],
    trunk: templates["Fuzzy 2D"][3],
    lchange: templates["Fuzzy 2D"][4],
    l1change: templates["Fuzzy 2D"][4],
    l2change: templates["Fuzzy 2D"][5],
    angle: templates["Fuzzy 2D"][6],
    turn: templates["Fuzzy 2D"][6],
    pitch:templates["Fuzzy 2D"][7],
    roll1:templates["Fuzzy 2D"][8],
    roll2:templates["Fuzzy 2D"][9],
    roll3:templates["Fuzzy 2D"][10],
    cylinderWidth: templates["Fuzzy 2D"][11],
    widthRatio: templates["Fuzzy 2D"][12],
    contraction: templates["Fuzzy 2D"][13],

    leafs:true,
    leafShape:"Points",
    sizeLeaf: leafSize,
    representation: "Geo Lines",

    tropism: tropism,
    tropismX:tropismX,
    tropismY:tropismY,
    tropismZ:tropismZ,
    tropismIntensity:tropismIntensity

  }
  //Update global vars based on starting ui
  contraction = params.contraction;
  widthChange=params.widthRatio;
  lengthChanges[0]= params.l1change;
  lengthChanges[1]= params.l2change;
  lengthChange= lengthChanges[0];

  turnChange = params.turn;
  pitchChange = params.pitch;
  roll1Change = params.roll1;
  roll2Change = params.roll2;
  roll3Change = params.roll3;

  cylinderW = params.cylinderWidth;

  var gui = new DAT.GUI({
    height : 5 * 32 - 1
  });

  //Creates a path based on axiom and rule dictionary
  var path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);

  //Generates Geometry and draws tree with base params
  updateTree(path, params.trunk, params.angle, params.representation);
  

  /* 
   * GUI Elements and On Update GUI
   * ------------------------------
   */

  gui.add(params, 'template', [ 'Fuzzy 2D', 'Standard 2D', 'Twiggy 2D', 'Pokey 2D',  "Seaweed Stalky 2D","Seaweed Loose 2D",  "Seaweed Fuzzy 2D",  'Standard' , 'Fuzzy' ,'Leaf Bush', 'Monopodial Tree 1', 'Monopodial Tree 2', 'Ternary Tree (WIP)'] ).onFinishChange(function(){

    var info = templates[params.template];

    params.axiom = info[0];
    params.rules = info[1]; 
    params.iter = info[2];
    params.trunk = info[3];
    params.lchange = info[4];
    params.l1change = info[4];
    params.l2change = info[5];
    params.angle = info[6];
    params.turn = info[6];
    params.pitch = info[7];
    params.roll1 = info[8];
    params.roll2 = info[9];
    params.roll3 = info[10];
    params.cylinderWidth = info[11];
    params.widthRatio = info[12];
    params.contraction = info[13];

    contraction = params.contraction;
    widthChange=params.widthRatio;
    lengthChanges[0]= params.l1change;
    lengthChanges[1]= params.l2change;
    lengthChange = lengthChanges[0];

    turnChange = params.turn;
    pitchChange = params.pitch;
    roll1Change = params.roll1;
    roll2Change = params.roll2;
    roll3Change = params.roll3;

    cylinderW = params.cylinderWidth;


    for (var i in gui.__controllers) {
      gui.__controllers[i].updateDisplay();
    }
    for (var i in anglesFolder.__controllers) {
      anglesFolder.__controllers[i].updateDisplay();
    }
    for (var i in changeFolder.__controllers) {
      changeFolder.__controllers[i].updateDisplay();
    }
    

    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  gui.add(params, 'axiom').onFinishChange(function(){
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  gui.add(params, 'rules').onFinishChange(function(){
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });


  gui.add(params, 'iter').onFinishChange(function(){
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });


  gui.add(params, 'angle', 0, 360).onFinishChange(function(){

    params.turn = params.angle;
    params.pitch = params.angle;
    params.roll1 = params.angle;
    params.roll2 = params.angle;
    params.roll3 = params.angle;

    turnChange = params.angle;
    pitchChange = params.angle;
    roll1Change = params.angle;
    roll2Change = params.angle;
    roll3Change = params.angle;

    for (var i in gui.__controllers) {
      gui.__controllers[i].updateDisplay();
    }
    for (var i in anglesFolder.__controllers) {
      anglesFolder.__controllers[i].updateDisplay();
    }
    for (var i in changeFolder.__controllers) {
      changeFolder.__controllers[i].updateDisplay();
    }
    
    
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  var anglesFolder = gui.addFolder('angles');

  anglesFolder.add(params, 'turn', 0, 360).onFinishChange(function(){
    turnChange = params.turn;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  anglesFolder.add(params, 'pitch', 0, 360).onFinishChange(function(){
    pitchChange = params.pitch;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  anglesFolder.add(params, 'roll1', 0, 360).onFinishChange(function(){
    roll1Change = params.roll1;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  anglesFolder.add(params, 'roll2', 0, 360).onFinishChange(function(){
    roll2Change = params.roll2;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  anglesFolder.add(params, 'roll3', 0, 360).onFinishChange(function(){
    roll3Change = params.roll3;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  gui.add(params, 'trunk').onFinishChange(function(){
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  gui.add(params, 'cylinderWidth').onFinishChange(function(){
    cylinderW = params.cylinderWidth;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  gui.add(params, 'widthRatio', 0, 2).onFinishChange(function(){
    widthChange = params.widthRatio;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  gui.add(params, 'contraction').onFinishChange(function(){
    contraction = params.contraction;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  gui.add(params, 'lchange').onFinishChange(function(){
    params.l1change = params.lchange;
    params.l2change = params.lchange;
    lengthChanges[0] = params.lchange;
    lengthChanges[1] = params.lchange;
    lengthChange= lengthChanges[0];
    for (var i in changeFolder.__controllers) {
      changeFolder.__controllers[i].updateDisplay();
    }
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  var changeFolder = gui.addFolder('change');
  changeFolder.add(params, 'l1change').onFinishChange(function(){
    lengthChanges[0] = params.l1change;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  changeFolder.add(params, 'l2change').onFinishChange(function(){
    lengthChanges[1] = params.l2change;
    path = expand_LSystem(params.axiom, stringToRuleDict(params.rules), params.iter);
    updateTree(path, params.trunk, params.angle, params.representation);
  });


  gui.add(params, 'representation', ["Geo Lines", "Lines", "Geometree"]).onFinishChange(function(){
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  var colorFolder = gui.addFolder('Colors');

  colorFolder.addColor(palette, "col_a").onFinishChange(function(){
    updateLineMats(numLevels+1);
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  colorFolder.addColor(palette, "col_b").onFinishChange(function(){
    updateLineMats(numLevels+1);
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  colorFolder.close();

  var leafsFolder = gui.addFolder('Leafs');
  leafsFolder.add(params, 'leafs').onFinishChange(function(){
    leafsOn = params.leafs;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  leafsFolder.add(params, 'leafShape', ["Points", "Planes"]).onFinishChange(function(){
    if(params.leafShape.localeCompare("Points")==0){
      leafType = 0;
    }
    else if(params.leafShape.localeCompare("Planes")==0){
      leafType = 1;
    }
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  leafsFolder.add(params, 'sizeLeaf').onFinishChange(function(){
    leafSize = params.sizeLeaf;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  leafsFolder.addColor(palette, "leaf_color").onFinishChange(function(){
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  var tropismFolder = gui.addFolder('Tropism');
  tropismFolder.add(params, 'tropism').onFinishChange(function(){
    tropism = params.tropism;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  tropismFolder.add(params, 'tropismX').onFinishChange(function(){
    tropismX = params.tropismX;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  tropismFolder.add(params, 'tropismY').onFinishChange(function(){
    tropismY = params.tropismY;
    updateTree(path, params.trunk, params.angle, params.representation);
  });

  tropismFolder.add(params, 'tropismZ').onFinishChange(function(){
    tropismZ = params.tropismZ;
    updateTree(path, params.trunk, params.angle, params.representation);
  });
 
  tropismFolder.add(params, 'tropismIntensity').onFinishChange(function(){
    tropismIntensity = params.tropismIntensity;
    updateTree(path, params.trunk, params.angle, params.representation);
  });
  

  var exportFolder = gui.addFolder('Export');

  var SVGExp = { SVG:function(){ exportSVG(); }};
  exportFolder.add(SVGExp, 'SVG');

  var OBJExp = { OBJ:function(){ 
    var exporter = new THREE.OBJExporter();

    var string = exporter.parse( scene );
    for (var i = 0; i<string.length; i++){
      if(string[i]=='o'){
        string = string.substr(0, i+2) + objCount.toString() + string.substr(i+2);
        objCount+=1;
      }
    }

    download("GeometreeExport.obj",string);
    
  }};
  exportFolder.add(OBJExp, 'OBJ');
}

function download(filename, text){
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

//Text created to follow Assignment 1 SVG renderer format
function exportSVG(){
    // Generate download of hello.txt file with some content
    var text = "";
    var svg_w = 500;
    svg_points = math.divide(math.multiply(svg_points, svg_w), height*1.5);

    text = text.concat("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
    text = text.concat("<!-- Generator: Adobe Illustrator 23.0.3, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n");
    text = text.concat("<svg version=\"1.1\" baseProfile=\"tiny\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n");
    text = text.concat("	 x=\"0px\" y=\"0px\" width=\"",svg_w,"px\" height=\"",svg_w,"px\" viewBox=\"0 0 ",svg_w," ",svg_w,"\" xml:space=\"preserve\">\n");
    for(var i = 0; i<svg_points.length; i+=4){
      text = text.concat("<line fill=\"none\" stroke=\"#000000\" stroke-width=\"0.8\" stroke-miterlimit=\"10\" x1=\"", svg_points[i]+(svg_w/2),"\" y1=\"", svg_w-(svg_points[i+1]+(svg_w/2)),"\" x2=\"",  svg_points[i+2]+(svg_w/2),"\" y2=\"" ,svg_w-(svg_points[i+3]+(svg_w/2)), "\"/>\n" );
    }
    text = text.concat("</svg>\n");
    
    var filename = "Geometree.svg";
    
    download(filename, text);
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  render();

}


function animate() {

    requestAnimationFrame( animate );

    // main scene
    renderer.setClearColor( 0xffffff, 0);

    renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );

    // Res of lines mats
    matLine.resolution.set(window.innerWidth, window.innerHeight);

    for(var i = 0; i<lineMats.length; i++){
      lineMats[i].resolution.set( window.innerWidth, window.innerHeight ); // resolution of the viewport

    }
    

    renderer.render( scene, camera );
}